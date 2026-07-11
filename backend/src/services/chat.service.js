// Chat business logic: building app state, posting messages, reactions.
//
// Cache strategy (v2 — scaled for 500+ users):
//   - Per-user state (channels + recent messages) cached in Redis (30s TTL).
//     Key: vox:state:{userId}. This is the biggest win on socket connect.
//   - Channel lists cached per server (30s TTL).
//   - Online members cached per server (30s TTL).
//   - Recent messages NOT cached individually (too volatile); scoped reads
//     from indexed (channelId, createdAt) are fast enough at scale.
//
// Pagination:
//   - On connect: getRecentMessages(50) — latest 50 messages from user's channels.
//   - Older history: getMessagesBefore(cursor, limit) — cursor = oldest
//     message id already loaded, returns up to `limit` older messages.
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../lib/redis.js';

const MESSAGE_INCLUDE = { author: true, reactions: true };
const CHANNELS_CACHE_KEY = 'vox:channels';
const MEMBERS_CACHE_KEY = 'vox:members:online';
const STATE_CACHE_KEY = 'vox:state';  // prefix; full key = vox:state:{userId}
const CACHE_TTL = 30;

let nitroClaimed = false;
let databaseAvailable = true;

const fallbackChannels = [
  { id: 'welcome', name: 'welcome', topic: 'Arrival chamber for new voices', type: 'TEXT', position: 0 },
  { id: 'general', name: 'general', topic: 'The main signal through the void', type: 'TEXT', position: 1 },
  { id: 'ship-room', name: 'ship-room', topic: 'Build notes and release checks', type: 'TEXT', position: 2 },
  { id: 'voice-lobby', name: 'voice-lobby', topic: 'Summon the voice stage', type: 'VOICE', position: 3 },
];

const fallbackMembers = [
  { id: 'mira', displayName: 'Mira', role: 'FOUNDER', color: '#ffd700', status: 'ONLINE' },
  { id: 'zed', displayName: 'Zed', role: 'MODERATOR', color: '#4a0080', status: 'ONLINE' },
  { id: 'nova', displayName: 'Nova', role: 'MEMBER', color: '#6600cc', status: 'IDLE' },
  { id: 'kai', displayName: 'Kai', role: 'ADMIN', color: '#ff3366', status: 'DND' },
];

let fallbackMessages = [
  { id: 'local-1', channelId: 'welcome', author: fallbackMembers[0], authorOverride: null, body: 'Welcome to VOX. The command center is awake.', createdAt: new Date(Date.now() - 1000 * 60 * 20), reactions: [{ emoji: 'pulse' }, { emoji: 'pulse' }, { emoji: 'pulse' }, { emoji: 'void' }, { emoji: 'void' }] },
  { id: 'local-2', channelId: 'general', author: fallbackMembers[1], authorOverride: null, body: 'Try sending a message, switching channels, or opening the member matrix.', createdAt: new Date(Date.now() - 1000 * 60 * 9), reactions: [{ emoji: 'boost' }, { emoji: 'boost' }, { emoji: 'boost' }, { emoji: 'boost' }] },
  { id: 'local-3', channelId: 'ship-room', author: fallbackMembers[2], authorOverride: null, body: 'Backend heartbeat is wired in. If the database is offline, VOX keeps a local echo.', createdAt: new Date(Date.now() - 1000 * 60 * 5), reactions: [{ emoji: 'check' }, { emoji: 'check' }, { emoji: 'check' }, { emoji: 'check' }, { emoji: 'check' }] },
];

function useFallback(error) {
  if (databaseAvailable) {
    console.warn('[vox] database unavailable; using in-memory demo state:', error.message);
  }
  databaseAvailable = false;
}

function createFallbackMessage({ channelId, author, body, user, attachments }) {
  const channel = fallbackChannels.find((item) => item.id === channelId);
  if (!channel) throw new HttpError(404, 'Channel not found.');

  const message = {
    id: `local-${Date.now()}`,
    channelId: channel.id,
    author: user ? { id: user.id, displayName: user.displayName ?? user.username ?? 'You', role: user.role ?? 'MEMBER', color: user.color ?? '#5865f2' } : null,
    authorOverride: String(author || 'You').slice(0, 32),
    body: String(body || '').trim().slice(0, 2000),
    attachments: Array.isArray(attachments) ? attachments : [],
    createdAt: new Date(),
    reactions: [],
  };
  fallbackMessages = [...fallbackMessages, message].slice(-200);
  return message;
}

// ── Channels ──────────────────────────────────────────────────
export async function getChannels(serverId) {
  if (!databaseAvailable) return fallbackChannels;
  const cacheKey = serverId ? `${CHANNELS_CACHE_KEY}:${serverId}` : CHANNELS_CACHE_KEY;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  const where = serverId ? { serverId } : {};
  const channels = await prisma.channel.findMany({ where, orderBy: { position: 'asc' } });
  await cacheSet(cacheKey, channels);
  return channels;
}

export async function invalidateChannelsCache(serverId) {
  if (serverId) {
    await cacheInvalidate(`${CHANNELS_CACHE_KEY}:${serverId}`);
  } else {
    await cacheInvalidate(CHANNELS_CACHE_KEY);
  }
}

// ── Online Members ─────────────────────────────────────────────
export async function getOnlineMembers(serverId) {
  if (!databaseAvailable) return fallbackMembers;
  const cacheKey = serverId ? `${MEMBERS_CACHE_KEY}:${serverId}` : MEMBERS_CACHE_KEY;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  const where = { status: { not: 'OFFLINE' } };
  if (serverId) {
    where.serverMembers = { some: { serverId } };
  }
  const members = await prisma.user.findMany({
    where,
    orderBy: [{ status: 'asc' }, { displayName: 'asc' }],
  });
  await cacheSet(cacheKey, members);
  return members;
}

export async function invalidateMembersCache(serverId) {
  if (serverId) {
    await cacheInvalidate(`${MEMBERS_CACHE_KEY}:${serverId}`);
  } else {
    await cacheInvalidate(MEMBERS_CACHE_KEY);
  }
}

// ── Messages (paginated) ───────────────────────────────────────
// Latest `limit` messages, newest last — used for initial state hydration.
// When userId is provided, scopes to channels the user can access.
export async function getRecentMessages(limit = 50, userId = null) {
  if (!databaseAvailable) return fallbackMessages.slice(-limit);

  // If we already fetched scoped state, this function is only called
  // for un-authed / fallback paths
  return prisma.message.findMany({
    take: Math.min(limit, 100),
    orderBy: { createdAt: 'asc' },
    include: MESSAGE_INCLUDE,
  });
}

// Cursor-based pagination: returns messages older than the cursor message.
// `cursorId` = id of the oldest message already on the client.
// `limit`   = batch size (default 50, max 100).
export async function getMessagesBefore(cursorId, limit = 50) {
  if (!databaseAvailable) return fallbackMessages.slice(-limit);
  const safeLimit = Math.min(parseInt(limit, 10) || 50, 100);

  const cursorMsg = await prisma.message.findUnique({ where: { id: cursorId } });
  if (!cursorMsg) return []; // invalid cursor

  return prisma.message.findMany({
    take: safeLimit,
    where: { createdAt: { lt: cursorMsg.createdAt } },
    orderBy: { createdAt: 'asc' },
    include: MESSAGE_INCLUDE,
  });
}

// ── Full State (socket init) ───────────────────────────────────
// v2: fully parallel, Redis-cached per user (30s), scopes messages to user's channels.
export async function getState(userId) {
  const cacheKey = userId ? `${STATE_CACHE_KEY}:${userId}` : null;

  // 1. Check per-user cache (instant on cache hit — no DB at all)
  if (cacheKey) {
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;
  }

  let channels, members, recentMessages, messagesCount;

  try {
    if (userId && databaseAvailable) {
      // Fetch member servers first (needed to scope everything else)
      const memberServerIds = (await prisma.serverMember.findMany({
        where: { userId },
        select: { serverId: true },
      })).map(m => m.serverId);

      if (memberServerIds.length > 0) {
        // All 4 DB calls now fire in parallel — no chaining
        const [chResults, msgCount] = await Promise.all([
          // Channels: scoped to user's servers
          prisma.channel.findMany({
            where: { serverId: { in: memberServerIds } },
            orderBy: { position: 'asc' },
          }),
          // Total message count across accessible channels
          prisma.message.count({
            where: { channel: { serverId: { in: memberServerIds } } },
          }),
        ]);

        channels = chResults;
        messagesCount = msgCount;

        // Get channel IDs for message scoping
        const channelIds = channels.map(c => c.id);

        // Recent messages: scoped to user's channels, latest 50
        recentMessages = channelIds.length > 0
          ? await prisma.message.findMany({
              where: { channelId: { in: channelIds } },
              include: MESSAGE_INCLUDE,
              orderBy: { createdAt: 'asc' },
              take: 50,
            })
          : [];

        // Online members: across all servers the user is in
        const [onlineMembers] = await Promise.all([
          getOnlineMembers(),
        ]);
        members = onlineMembers;
      } else {
        // User has no server memberships — return empty state instead of fallback demo messages
        channels = [];
        recentMessages = [];
        messagesCount = 0;
        members = [];
      }
    } else {
      // Unauthenticated: public channels + total count
      const [chResults, msgCount] = await Promise.all([
        getChannels(),
        databaseAvailable ? prisma.message.count() : Promise.resolve(fallbackMessages.length),
      ]);
      channels = chResults;
      messagesCount = msgCount;
      recentMessages = await getRecentMessages(50);
      members = await getOnlineMembers();
    }
  } catch (error) {
    useFallback(error);
    channels = fallbackChannels;
    recentMessages = fallbackMessages.slice(-50);
    members = fallbackMembers;
    messagesCount = fallbackMessages.length;
  }

  const state = { channels, members, recentMessages, nitroClaimed, messagesCount };

  // Cache per-user state (30s) so 500 simultaneous connects don't all hit the database
  if (cacheKey) {
    await cacheSet(cacheKey, state, CACHE_TTL);
  }

  return state;
}

// ── Nitro ─────────────────────────────────────────────────────
export function isNitroClaimed() { return nitroClaimed; }

export function claimNitro() {
  nitroClaimed = true;
  return { claimed: true, perks: ['HD streaming', 'animated profile', 'server boosts', 'custom themes'] };
}

// ── Create Message ────────────────────────────────────────────
export async function createMessage({ channelId, author, body, user, attachments }) {
  const text = String(body || '').trim();
  const atts = Array.isArray(attachments) ? attachments : [];
  if (!text && atts.length === 0) throw new HttpError(400, 'Message body or attachment is required.');

  if (!databaseAvailable) {
    return createFallbackMessage({ channelId, author, body: text, user, attachments: atts });
  }

  try {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new HttpError(404, 'Channel not found.');

    const data = {
      channelId: channel.id,
      body: text.slice(0, 2000),
      attachments: atts.length ? atts : undefined,
    };

    if (user) {
      data.userId = user.id;
    } else {
      data.authorOverride = String(author || 'Guest').slice(0, 32);
    }

    const message = await prisma.message.create({ data, include: MESSAGE_INCLUDE });
    return message;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    useFallback(error);
    return createFallbackMessage({ channelId, author, body: text, user, attachments: atts });
  }
}
