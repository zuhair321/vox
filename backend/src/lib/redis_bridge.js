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

// Local Socket.io fallback. In single-process / offline desktop mode there is
// no Redis and no Phoenix subscriber, so events published to Redis would never
// reach connected browser clients. When Socket.io is initialised we register
// its `io` instance here and emit directly to the relevant room, keeping
// realtime working without Redis. When Redis IS configured (scaled deploys),
// the Phoenix bridge remains the delivery mechanism and this fallback is unused.
let localIO = null;
export function setLocalIO(io) {
  localIO = io;
}

export async function emitRealtimeEvent(event, id, payload) {
  // Direct local delivery (always works in single-process mode).
  if (localIO) {
    try {
      if (id) localIO.to(String(id)).emit(event, payload);
      else localIO.emit(event, payload);
    } catch (err) {
      if (!global.__bridgeLocalWarned) {
        console.warn('[bridge] local emit failed:', err.message);
        global.__bridgeLocalWarned = true;
      }
    }
  }

  // Redis publish for the Phoenix bridge / multi-node scaling.
  try {
    const { publisher } = await getPubSub();
    if (!publisher) return;

    const ch = channelFor(event, id);
    await publisher.publish(ch, JSON.stringify(payload));
  } catch (err) {
    // Only warn once to reduce spam
    if (!global.__bridgeWarned) {
      console.warn('[bridge] publish failed:', err.message);
      global.__bridgeWarned = true;
    }
  }
}
