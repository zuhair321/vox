// NOTE: no import of sockets/index.js here — getIO is unused (all functions
// take the io instance as a parameter) and statically importing it dragged the
// whole socket.io + chat.service chain (~2s+) into every module's load path.
import { emitRealtimeEvent } from '../lib/redis_bridge.js';

const FLUSH_MS = 100;

function priorityOf(event) {
  if (event.startsWith('message:') || event === 'dm:new') return 0;
  if (event === 'presence:update') return 1;
  if (event.startsWith('typing:')) return 2;
  return 3;
}

const buckets = new Map(); // room -> priority -> Array<{ event, payload }>

function getBucket(room) {
  let bucket = buckets.get(room);
  if (!bucket) {
    bucket = [];
    buckets.set(room, bucket);
  }
  return bucket;
}

function enqueue(room, event, payload) {
  const p = priorityOf(event);
  const bucket = getBucket(room);
  if (!bucket[p]) bucket[p] = [];
  bucket[p].push({ event, payload });
}

function flushBucket(room, bucket) {
  for (let p = 0; p < bucket.length; p++) {
    const set = bucket[p];
    if (!set || set.length === 0) continue;
    for (const item of set) {
      emitRealtimeEvent(item.event, room, item.payload);
    }
  }
}

function flushAll() {
  if (buckets.size === 0) return;
  for (const [room, bucket] of buckets) {
    flushBucket(room, bucket);
  }
  buckets.clear();
}

let timer = null;

export function initBroadcaster() {
  if (timer) return;
  timer = setInterval(flushAll, FLUSH_MS);
}

export function broadcast(io, room, event, payload) {
  emitRealtimeEvent(event, room, payload);
}

export function batchBroadcast(io, room, event, payload) {
  emitRealtimeEvent(event, room, payload);
}


// Fire web-push notifications to channel members after a message is broadcast.
// Best-effort: catches its own errors so it never breaks the realtime path.
export async function broadcastPushForMessage(message, opts = {}) {
  try {
    if (!message || !message.channelId) return;
    const { prisma } = await import('./prisma.js');
    const { sendPushToUser, shouldNotify } = await import('../services/pushDelivery.service.js');

    const ch = await prisma.channel.findUnique({
      where: { id: message.channelId },
      select: { serverId: true, name: true },
    });
    if (!ch || !ch.serverId) return;

    const members = await prisma.serverMember.findMany({
      where: { serverId: ch.serverId, userId: { not: null } },
      select: { userId: true },
    });
    const author = message.userId || null;
    const title = (message.author && (message.author.displayName || message.author.username)) || 'VOX';
    const previewBody = (message.body || '').slice(0, 160);

    const mentionUserIds = Array.isArray(message.mentions) ? message.mentions.map((m) => m.userId).filter(Boolean) : [];
    for (const m of members) {
      const userId = m.userId;
      if (!userId || userId === author) continue;
      const yes = await shouldNotify(userId, {
        channelId: message.channelId,
        serverId: ch.serverId,
        mentionedUserIds: mentionUserIds,
        mentionedType: opts.mentionedType || null,
      });
      if (!yes) continue;
      await sendPushToUser(userId, {
        title,
        body: previewBody,
        tag: 'vox-' + message.channelId,
        url: '/channels/' + ch.serverId + '/' + message.channelId,
      });
    }
  } catch (err) {
    console.warn('[broadcaster] push hook error:', err && err.message);
  }
}
