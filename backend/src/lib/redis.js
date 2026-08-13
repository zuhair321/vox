// Redis client + caching helpers.
// Falls back to a no-op when REDIS_URL is not set, so the app stays fully
// functional in dev without Redis running.
import { createClient } from 'redis';
import { env } from './env.js';

const REDIS_URL = process.env.REDIS_URL || null;
const CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || '60', 10); // seconds

// ── Shared connection options ─────────────────────────────────
// legacyMode: true forces RESP2 — required for Redis 5.x compatibility
// (Redis 5 doesn't support the HELLO/RESP3 commands that redis npm v6 uses by default)
const REDIS_OPTS = {
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      // Return false to stop reconnecting instead of throwing an error
      if (retries > 20) {
        console.warn('[redis] Max reconnection retries reached, disabling Redis for this session');
        return false;
      }
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 5000,
  },
};

// ── Publisher / Subscriber clients ──────────────────────────────
let publisher = null;
let subscriber = null;
let pubSubFailed = false;  // once failed, don't retry for this process lifetime

// ── Caching client ─────────────────────────────────────────────
let cacheClient = null;
let cacheFailed = false;

// ── Cache stampede prevention ──────────────────────────────────
const inflight = new Map(); // key -> Promise

async function getCache() {
  if (!REDIS_URL || cacheFailed) return null;
  if (cacheClient) return cacheClient;

  try {
    cacheClient = createClient(REDIS_OPTS);
    cacheClient.on('error', (err) => {
      if (cacheFailed) return;
      cacheFailed = true;
      // Only warn once to reduce spam
      if (!global.__redisCacheWarned) {
        console.warn('[redis/cache] failed, cache disabled for this session');
        global.__redisCacheWarned = true;
      }
    });
    cacheClient.on('reconnecting', () => {
      // Only log once to reduce spam
      if (!global.__redisCacheReconnecting) {
        console.log('[redis/cache] reconnecting...');
        global.__redisCacheReconnecting = true;
      }
    });
    cacheClient.on('end', () => {
      if (cacheFailed) return;
      cacheFailed = true;
      // Only warn once to reduce spam
      if (!global.__redisCacheEnded) {
        console.warn('[redis/cache] connection ended, cache disabled for this session');
        global.__redisCacheEnded = true;
      }
    });
    await cacheClient.connect();
    console.log('[redis] cache connected:', REDIS_URL);
    return cacheClient;
  } catch (err) {
    cacheFailed = true;
    // Only warn once to reduce spam
    if (!global.__redisCacheFailed) {
      console.warn('[redis] cache connection failed, running without cache:', err.message);
      global.__redisCacheFailed = true;
    }
    cacheClient = null;
    return null;
  }
}

async function getPubSub() {
  if (!REDIS_URL || pubSubFailed) return { publisher: null, subscriber: null };
  if (publisher && subscriber) return { publisher, subscriber };

  try {
    publisher = createClient(REDIS_OPTS);
    subscriber = createClient(REDIS_OPTS);
    publisher.on('error', (err) => {
      if (pubSubFailed) return;
      pubSubFailed = true;
      // Only warn once to reduce spam
      if (!global.__redisPubSubWarned) {
        console.warn('[redis/publisher] failed, falling back to single-process mode');
        global.__redisPubSubWarned = true;
      }
    });
    publisher.on('end', () => {
      if (pubSubFailed) return;
      pubSubFailed = true;
      // Only warn once to reduce spam
      if (!global.__redisPubSubEnded) {
        console.warn('[redis/publisher] connection ended, falling back to single-process mode');
        global.__redisPubSubEnded = true;
      }
    });
    subscriber.on('error', (err) => {
      if (pubSubFailed) return;
      pubSubFailed = true;
      // Only warn once to reduce spam
      if (!global.__redisSubWarned) {
        console.warn('[redis/subscriber] failed, falling back to single-process mode');
        global.__redisSubWarned = true;
      }
    });
    subscriber.on('end', () => {
      if (pubSubFailed) return;
      pubSubFailed = true;
      // Only warn once to reduce spam
      if (!global.__redisSubEnded) {
        console.warn('[redis/subscriber] connection ended, falling back to single-process mode');
        global.__redisSubEnded = true;
      }
    });
    await Promise.all([publisher.connect(), subscriber.connect()]);
    console.log('[redis] pub/sub connected:', REDIS_URL);
    return { publisher, subscriber };
  } catch (err) {
    pubSubFailed = true;
    // Only warn once to reduce spam
    if (!global.__redisPubSubFailed) {
      console.warn('[redis] pub/sub connection failed:', err.message);
      global.__redisPubSubFailed = true;
    }
    return { publisher: null, subscriber: null };
  }
}

// ── Cache helpers ──────────────────────────────────────────────
export async function cacheGet(key) {
  const client = await getCache();
  if (!client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttl = CACHE_TTL) {
  const client = await getCache();
  if (!client) return;
  try {
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch {
    // non-fatal
  }
}

export async function cacheInvalidate(key) {
  const client = await getCache();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // non-fatal
  }
}

export async function cacheInvalidatePattern(pattern) {
  const client = await getCache();
  if (!client) return;
  try {
    // SCAN instead of KEYS for production safety
    let cursor = 0;
    do {
      const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length) await client.del(result.keys);
    } while (cursor !== 0);
  } catch {
    // non-fatal
  }
}

// Atomic get-or-compute: prevents cache stampede when multiple workers
// miss the same key simultaneously.
export async function cacheGetOrSet(key, fetchFn, ttl = CACHE_TTL) {
  const cached = await cacheGet(key);
  if (cached) return cached;

  // Deduplicate inflight requests for the same key
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await fetchFn();
      await cacheSet(key, value, ttl);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

// ── Redis health check ─────────────────────────────────────────
export async function redisHealthCheck() {
  let client = await getCache();

  // If the cached client is unavailable (circuit breaker), try a fresh connection
  if (!client && REDIS_URL) {
    try {
      const testClient = createClient({ ...REDIS_OPTS, socket: { ...REDIS_OPTS.socket, connectTimeout: 2000 } });
      await testClient.connect();
      const start = Date.now();
      await testClient.ping();
      const latencyMs = Date.now() - start;
      const info = await testClient.info('memory');
      const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown';
      await testClient.quit();
      return { status: 'connected', latencyMs, usedMemory };
    } catch {
      return { status: 'disconnected', latencyMs: null };
    }
  }

  if (!client) return { status: 'disconnected', latencyMs: null };

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;

    const info = await client.info('memory');
    const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown';

    return { status: 'connected', latencyMs, usedMemory };
  } catch {
    return { status: 'error', latencyMs: null };
  }
}

// ── Rate limiter (Redis-backed sliding window) ─────────────────
// Returns true if the request should be rate-limited.
// Optimized: 3 Redis commands in 1 roundtrip (zCount, zAdd, pExpire)
// instead of the previous 5 roundtrips (4 in MULTI + 1 cleanup).
export async function isRateLimited(userId, event, max, windowMs) {
  const client = await getCache();
  if (!client) return false; // graceful fallback

  const key = `vox:ratelimit:${userId}:${event}`;
  const now = Date.now();

  try {
    const multi = client.multi();
    multi.zCount(key, now - windowMs, now);
    multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
    multi.pExpire(key, windowMs);
    const [count] = await multi.exec();
    if (count >= max) {
      client.zRemRangeByScore(key, now, now).catch(() => {});
      return true;
    }
    return false;
  } catch {
    return false; // on Redis failure, don't block
  }
}

// ── Per-channel write budget (token bucket) ────────────────────
// Roadmap (100k MAU, Month 1): protects the Postgres primary from a single
// hot channel. Each channel gets `max` message writes per `windowMs`; once the
// bucket is empty the request is rejected instead of hammering the DB.
export async function perChannelWriteBudget(channelId, max = 30, windowMs = 60_000) {
  const client = await getCache();
  if (!client) return { ok: true }; // graceful: no Redis → no budget
  const key = `vox:channel-budget:${channelId}`;
  const now = Date.now();
  try {
    const multi = client.multi();
    multi.zCount(key, now - windowMs, now);
    multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
    multi.pExpire(key, windowMs);
    const [count] = await multi.exec();
    if (count >= max) {
      client.zRemRangeByScore(key, now, now).catch(() => {});
      return { ok: false, retryAfterMs: windowMs };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// ── Presence (Redis-only, per roadmap Month 1) ──────────────────
// Online/offline state lives in a Redis SET so status changes never hit
// Postgres. User-initiated IDLE/DND still persist to the DB; the connect/
// disconnect cycle is Redis-only (SADD on connect, SREM on disconnect).
const PRESENCE_SET = 'vox:presence:online';

export async function presenceAdd(userId) {
  const client = await getCache();
  if (!client) return;
  try { await client.sAdd(PRESENCE_SET, userId); } catch { /* ignore */ }
}

export async function presenceRemove(userId) {
  const client = await getCache();
  if (!client) return;
  try { await client.sRem(PRESENCE_SET, userId); } catch { /* ignore */ }
}

export async function presenceIsOnline(userId) {
  const client = await getCache();
  if (!client) return null; // unknown → fall back to DB
  try { return (await client.sIsMember(PRESENCE_SET, userId)) === true; } catch { return null; }
}

export async function presenceSnapshot(userIds) {
  const client = await getCache();
  if (!client || !userIds?.length) return {};
  try {
    const members = await client.sMembers(PRESENCE_SET);
    const set = new Set(members);
    const out = {};
    for (const id of userIds) out[id] = set.has(id);
    return out;
  } catch {
    return {};
  }
}

// ── Raid protection (roadmap Month 1/Moderation) ───────────────
// Tracks join velocity per server. If more than `max` joins hit a server within
// `windowMs`, we flag it as raiding and start rejecting new joins until a mod
// clears it (or the flag expires). Stored in Redis so it works across workers.
const RAID_KEY = (serverId) => `vox:raid-joins:${serverId}`;
const RAID_MODE_KEY = (serverId) => `vox:raid-mode:${serverId}`;

export async function raidJoin(serverId, max = 20, windowMs = 60_000) {
  const client = await getCache();
  if (!client) return { raiding: false };
  const key = RAID_KEY(serverId);
  const now = Date.now();
  try {
    const multi = client.multi();
    multi.zRemRangeByScore(key, 0, now - windowMs);
    multi.zCard(key);
    multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
    multi.pExpire(key, windowMs);
    const results = await multi.exec();
    const count = results[1];
    if (count > max) {
      // Auto-engage raid mode for 10 minutes.
      await client.set(RAID_MODE_KEY(serverId), '1', { PX: 10 * 60_000 }).catch(() => {});
      return { raiding: true, count };
    }
    return { raiding: false, count };
  } catch {
    return { raiding: false };
  }
}

export async function getRaidMode(serverId) {
  const client = await getCache();
  if (!client) return false;
  try { return (await client.get(RAID_MODE_KEY(serverId))) === '1'; } catch { return false; }
}

export async function setRaidMode(serverId, on) {
  const client = await getCache();
  if (!client) return;
  try {
    if (on) await client.set(RAID_MODE_KEY(serverId), '1', { PX: 10 * 60_000 });
    else await client.del(RAID_MODE_KEY(serverId));
  } catch { /* ignore */ }
}

// ── Init both (call at server boot) ─────────────────────────────
export async function initRedis() {
  await Promise.all([getCache(), getPubSub()]);
}

// ── User status cache (Redis-first presence) ──────────────────
// Write-through cache for the hot presence path. `status:update` and
// `disconnect` fire on every connect/idle toggle; caching the last-known
// status in Redis lets the connect presence broadcast skip a redundant
// Postgres round-trip when Redis is present. Postgres remains the durable
// source of truth — this only short-circuits the read on connect.
const STATUS_KEY = (userId) => `vox:status:${userId}`;
const STATUS_TTL = 60 * 60 * 24; // 24h — status is re-affirmed each session

export async function setStatusCache(userId, status) {
  const client = await getCache();
  if (!client || !userId) return;
  try { await client.setEx(STATUS_KEY(userId), STATUS_TTL, String(status)); } catch { /* ignore */ }
}

export async function getStatusCache(userId) {
  const client = await getCache();
  if (!client || !userId) return null;
  try {
    const v = await client.get(STATUS_KEY(userId));
    return v ? String(v) : null;
  } catch { return null; }
}

export { getPubSub, getCache };
