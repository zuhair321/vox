// Single shared PrismaClient instance.
// Reusing one client across the process avoids exhausting DB connections.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

if (!process.env.DATABASE_URL) {
  console.log('[DB] No DATABASE_URL set — the database client will not connect until one is provided.');
}

let prismaInstance = null;
let prismaReplicaInstance = null;
let connectionResolved = false;
let connectPromise = null;
let replicaConnectPromise = null;

async function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Point it at a Postgres (recommended) or SQLite database.');
  }

  // On free Postgres tiers (Supabase ~20 conns, Neon similar) a handful of
  // workers + the Redis adapter can exhaust the pool fast. Cap the per-process
  // pool by appending pool params to the connection URL. NOTE: these are URL
  // query params, NOT PrismaClient constructor options — passing
  // `connectionLimit`/`poolTimeout`/`maxWait` to the constructor throws
  // "Unknown property … provided to PrismaClient constructor" and breaks every
  // connection (this is what made the packaged NODE_ENV=production app fail).
  const isProd = process.env.NODE_ENV === 'production';
  const parsedLimit = parseInt(process.env.PRISMA_CONNECTION_LIMIT || '', 10);
  let datasourceUrl = process.env.DATABASE_URL;
  if (isProd && /^postgres(ql)?:\/\//i.test(datasourceUrl)) {
    const connectionLimit = Number.isFinite(parsedLimit) ? parsedLimit : 5;
    try {
      const u = new URL(datasourceUrl);
      if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', String(connectionLimit));
      if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '20');
      datasourceUrl = u.toString();
    } catch { /* leave the URL untouched if it can't be parsed */ }
  }

  const client = new PrismaClient({
    log: isProd ? ['error'] : ['warn', 'error'],
    datasourceUrl,
  });

  // Race $connect() against a timeout. If the timeout wins (e.g. Postgres is
  // still booting when the app launches), tear down the half-open client so it
  // doesn't leak a background connection, then let the caller retry.
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Connection timeout')), 8000);
  });
  try {
    await Promise.race([client.$connect(), timeoutPromise]);
  } catch (err) {
    clearTimeout(timer);
    await client.$disconnect().catch(() => {});
    throw err;
  }
  clearTimeout(timer);
  console.log('[DB] database connected');
  return client;
}

async function getPrisma() {
  if (prismaInstance) return prismaInstance;
  if (!connectPromise) {
    connectPromise = createPrismaClient().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }
  try {
    prismaInstance = await connectPromise;
  } catch (error) {
    console.error('[DB] database connection failed:', error.message);
    console.error('[DB] VOX will retry when a database operation is requested.');
    prismaInstance = null;
    connectPromise = null;
  }
  connectionResolved = true;
  return prismaInstance;
}

// Errors that mean the cached client can no longer reach the database. When we
// see one, drop the cached instance so the next call reconnects from scratch
// instead of failing forever (the bug that made login 500 after the DB was
// briefly unreachable at startup).
const FATAL_DB_ERROR_CODES = new Set([
  'P1000', // authentication failed
  'P1001', // can't reach database server
  'P1002', // database server timed out
  'P1008', // operation timed out
  'P1017', // server has closed the connection
]);

function isFatalConnectionError(err) {
  if (!err) return false;
  if (FATAL_DB_ERROR_CODES.has(err.code)) return true;
  // Prisma wraps some socket errors without a P-code.
  const msg = String(err.message || '');
  return /can't reach database server|connection.*closed|ECONNREFUSED|ETIMEDOUT|Connection timeout/i.test(msg);
}

async function resetPrisma() {
  const stale = prismaInstance;
  prismaInstance = null;
  connectPromise = null;
  if (stale) await stale.$disconnect().catch(() => {});
}

async function getPrismaReplica() {
  if (prismaReplicaInstance) return prismaReplicaInstance;
  if (!process.env.DATABASE_REPLICA_URL) {
    prismaReplicaInstance = await getPrisma();
    return prismaReplicaInstance;
  }
  if (!replicaConnectPromise) {
    replicaConnectPromise = (async () => {
      try {
        const client = new PrismaClient({
          log: ['error'],
          datasourceUrl: process.env.DATABASE_REPLICA_URL,
        });
        await client.$connect();
        console.log('[DB] Read replica connected');
        return client;
      } catch (error) {
        console.warn('[DB] Read replica connection failed, using primary:', error.message);
        return null;
      }
    })().catch((err) => {
      replicaConnectPromise = null;
      throw err;
    });
  }
  try {
    prismaReplicaInstance = await replicaConnectPromise;
  } catch {
    prismaReplicaInstance = null;
  }
  if (!prismaReplicaInstance) {
    prismaReplicaInstance = await getPrisma();
  }
  return prismaReplicaInstance;
}

function createModelDelegate(modelName) {
  return new Proxy(async () => {}, {
    get(_target, methodProp) {
      if (methodProp === 'then' || methodProp === 'catch' || methodProp === 'finally') {
        return undefined;
      }
      return async (...args) => {
        const run = async () => {
          const client = await getPrisma();
          const model = client && client[modelName];
          if (!model || typeof model[methodProp] !== 'function') {
            throw new Error(`[DB] ${modelName}.${String(methodProp)} requires a database connection. Start PostgreSQL and set DATABASE_URL.`);
          }
          return model[methodProp](...args);
        };
        try {
          return await run();
        } catch (err) {
          if (isFatalConnectionError(err)) {
            console.warn(`[DB] connection error on ${modelName}.${String(methodProp)} — reconnecting and retrying once.`);
            await resetPrisma();
            return run();
          }
          throw err;
        }
      };
    },
    apply(_target, _thisArg, args) {
      return async () => {
        const client = await getPrisma();
        const model = client && client[modelName];
        if (!model || typeof model[methodProp] !== 'function') {
          throw new Error(`[DB] ${modelName} requires a database connection. Start PostgreSQL and set DATABASE_URL.`);
        }
        return model[methodProp](...args);
      };
    },
  });
}

function createPrismaProxy(getClientFn) {
  return new Proxy({}, {
    get(_t, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop.startsWith('$')) {
        return async (...args) => {
          const run = async () => {
            const client = await getClientFn();
            if (!client || typeof client[prop] !== 'function') {
              throw new Error(`[DB] ${prop} requires a database connection. Start PostgreSQL and set DATABASE_URL.`);
            }
            return client[prop](...args);
          };
          try {
            return await run();
          } catch (err) {
            // Only the primary client can be reset here; retry once on a dead
            // connection so /health and $queryRaw self-heal instead of 503ing
            // forever after a transient startup DB outage.
            if (getClientFn === getPrisma && isFatalConnectionError(err)) {
              console.warn(`[DB] connection error on ${prop} — reconnecting and retrying once.`);
              await resetPrisma();
              return run();
            }
            throw err;
          }
        };
      }
      return createModelDelegate(prop);
    },
  });
}

export { getPrisma, getPrismaReplica };
export const prisma = createPrismaProxy(getPrisma);
export const prismaReplica = createPrismaProxy(getPrismaReplica);
