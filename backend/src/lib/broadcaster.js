import { getIO } from '../sockets/index.js';
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
