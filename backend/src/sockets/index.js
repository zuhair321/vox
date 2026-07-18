// Socket.io setup.
//
// Auth model:
//   - Preferred: client passes { auth: { token } } in the handshake. We verify
//     the JWT and attach the user to socket.data.user.
//   - Fallback: if no token is sent, the socket is still admitted as an
//     anonymous guest. This keeps the existing demo (and the Electron build
//     before the login UI lands) working without auth.
//
// Redis adapter:
//   When REDIS_URL is set, Socket.io uses a Redis adapter so multiple
//   Node.js workers (PM2 cluster) share events and scale horizontally.
//   Falls back to in-memory (single-process) when Redis is unavailable.
//
// Events emitted:   state:init, message:new, message:reactions, nitro:claimed, typing
// Events received:  typing
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { env, isAllowedOrigin } from '../lib/env.js';
import { getState } from '../services/chat.service.js';
import { mapChannel, mapMessage, mapMember } from '../lib/mappers.js';
import { registerHandlers } from './handlers.js';
import { getPubSub } from '../lib/redis.js';

let io = null;

export async function initSockets(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Redis adapter for horizontal scaling ─────────────────
  // Bounded so a misconfigured/unreachable REDIS_URL can never block boot:
  // if pub/sub isn't ready within 3s we proceed in single-process mode.
  let publisher = null;
  let subscriber = null;
  try {
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ publisher: null, subscriber: null }), 3000),
    );
    ({ publisher, subscriber } = await Promise.race([getPubSub(), timeout]));
  } catch {
    publisher = null;
    subscriber = null;
  }
  if (publisher && subscriber) {
    io.adapter(createAdapter(publisher, subscriber));
    console.log('[socket.io] Redis adapter active');
  } else {
    console.log('[socket.io] Running in single-process mode (no Redis)');
  }

  // ── Auth middleware (runs once per connection) ────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Admit as anonymous guest — keeps demo/desktop working without login.
      socket.data.user = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, env.jwt.accessSecret);
      socket.data.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    try {
      const userId = socket.data.user?.id;
      // getState() now returns channels, members, recentMessages, and messagesCount
      // all in a single cached call — no second query needed.
      const state = await getState(userId);
      socket.emit('state:init', {
        channels: state.channels.map(mapChannel),
        messages: (state.recentMessages || []).map(mapMessage),
        onlineMembers: state.members.map(mapMember),
        nitroClaimed: state.nitroClaimed,
        hasMore: state.messagesCount > 50,
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
