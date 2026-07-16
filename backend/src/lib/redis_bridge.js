// Node.js → Phoenix Redis bridge publisher.
//
// Replaces direct `io.to(room).emit(...)` in backend/src/sockets/handlers.js
// and backend/src/routes/*.js. Instead of emitting directly, we publish to
// Redis channels that the Phoenix RedisBridge GenServer subscribes to.
//
// Channel naming convention:
//   vox:event:<eventName>              (global, no ID)
//   vox:event:<eventName>:<id>         (scoped to channel/server/dm/voice)
//
// Examples:
//   vox:event:message:new:channelId
//   vox:event:typing:start:channelId
//   vox:event:dm:new:dmId
//   vox:event:presence:update
import { getPubSub } from './redis.js';

const PREFIX = 'vox:event:';

function channelFor(event, id) {
  return id ? `${PREFIX}${event}:${id}` : `${PREFIX}${event}`;
}

export async function emitRealtimeEvent(event, id, payload) {
  try {
    const { publisher } = await getPubSub();
    if (!publisher) return;

    const ch = channelFor(event, id);
    await publisher.publish(ch, JSON.stringify(payload));
  } catch (err) {
    console.warn('[bridge] publish failed:', err.message);
  }
}
