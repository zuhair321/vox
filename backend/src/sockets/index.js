// Socket.io setup.
//
// Auth model:
//   - Preferred: client passes { auth: { token } } in the handshake. We verify
//     the JWT and attach the user to socket.data.user.
//   - Fallback: if no token is sent, the socket is still admitted as an
//     anonymous guest. This keeps the existing demo (and the Electron build
//     before the login UI lands) working without auth.
//
// Events emitted:   state:init, message:new, message:reactions, nitro:claimed, typing
// Events received:  typing
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { getState } from '../services/chat.service.js';
import { mapChannel, mapMessage, mapMember } from '../lib/mappers.js';
import { registerHandlers } from './handlers.js';

let io = null;

export function initSockets(server) {
  io = new Server(server, {
    cors: {
      origin: env.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Auth middleware (runs once per connection) ────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, env.jwt.accessSecret);
        socket.data.user = {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
        };
      } catch {
        // Invalid token → treat as anonymous rather than rejecting, so a
        // stale token on the client doesn't hard-break the demo.
        socket.data.user = null;
      }
    } else {
      socket.data.user = null;
    }
    next();
  });

  io.on('connection', async (socket) => {
    // Send full state on connect so the client hydrates immediately.
    try {
      const { channels, messages, members, nitroClaimed } = await getState();
      socket.emit('state:init', {
        channels: channels.map(mapChannel),
        messages: messages.map(mapMessage),
        onlineMembers: members.map(mapMember),
        nitroClaimed,
      });
    } catch (e) {
      console.error('[socket] failed to send state:init', e.message);
    }

    registerHandlers(io, socket);
  });

  return io;
}

// Helper: broadcast to every connected client.
export function emitAll(event, payload) {
  if (io) io.emit(event, payload);
}

export function getIO() {
  return io;
}
