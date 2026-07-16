// Single shared PrismaClient instance.
// Reusing one client across the process avoids exhausting DB connections.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

if (!process.env.DATABASE_URL) {
  console.log('[DB] No DATABASE_URL set — SQLite file will be created automatically.');
}

let prismaInstance = null;
let prismaReplicaInstance = null;
let connectionResolved = false;
let connectPromise = null;
let replicaConnectPromise = null;

async function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Set DATABASE_URL to point to a SQLite file.');
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    datasourceUrl: process.env.DATABASE_URL,
  });

  const connectPromise = client.$connect();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Connection timeout')), 8000)
  );

  await Promise.race([connectPromise, timeoutPromise]);
  console.log('[DB] SQLite connected');
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
    console.error('[DB] SQLite connection failed:', error.message);
    console.error('[DB] VOX will retry when a database operation is requested.');
    prismaInstance = null;
  }
  connectionResolved = true;
  return prismaInstance;
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
        const client = await getPrisma();
        const model = client[modelName];
        if (!model || typeof model[methodProp] !== 'function') {
          throw new Error(`[DB] ${modelName}.${String(methodProp)} requires a database connection. Start PostgreSQL and set DATABASE_URL.`);
        }
        return model[methodProp](...args);
      };
    },
    apply(_target, _thisArg, args) {
      return async () => {
        const client = await getPrisma();
        const model = client[modelName];
        if (!model || typeof model[modelName] !== 'function') {
          throw new Error(`[DB] ${modelName} requires a database connection. Start PostgreSQL and set DATABASE_URL.`);
        }
        return model[modelName](...args);
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
          const client = await getClientFn();
          if (!client || typeof client[prop] !== 'function') {
            throw new Error(`[DB] ${prop} requires a database connection. Start PostgreSQL and set DATABASE_URL.`);
          }
          return client[prop](...args);
        };
      }
      return createModelDelegate(prop);
    },
  });
}

export { getPrisma, getPrismaReplica };
export const prisma = createPrismaProxy(getPrisma);
export const prismaReplica = createPrismaProxy(getPrismaReplica);
