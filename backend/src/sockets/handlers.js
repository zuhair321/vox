import { prisma } from '../lib/prisma.js';
import { deliverWebhooks } from '../services/webhook.service.js';
import { sanitize } from '../middleware/sanitize.js';
import { normalizeAttachments } from '../lib/attachments.js';
import { isRateLimited } from '../lib/redis.js';
import { emitRealtimeEvent } from '../lib/redis_bridge.js';
import { getState } from '../services/chat.service.js';

const voiceChannelBySocket = new Map();
const voiceServerBySocket = new Map();
const voiceUserBySocket = new Map();
const screenSharingBySocket = new Map();

// ── Socket event rate limits (Redis-backed sliding window) ────
const RATE_LIMITS = {
  'message:send': { max: 30, windowMs: 60_000 },
  'dm:send': { max: 30, windowMs: 60_000 },
  'message:react': { max: 60, windowMs: 60_000 },
  'typing:start': { max: 20, windowMs: 10_000 },
  'dm:typing:start': { max: 20, windowMs: 10_000 },
};

async function checkRateLimit(userId, event) {
  const limit = RATE_LIMITS[event];
  if (!limit) return false;
  // Skip Redis rate limiting when not configured for better performance
  return isRateLimited(userId, event, limit.max, limit.windowMs);
}

function getSocketUser(socket) {
  const user = socket.data.user;
  if (!user?.id) return null;
  return { id: user.id, username: user.username || 'Unknown' };
}

function handleVoiceLeave(io, socket) {
  const channelId = voiceChannelBySocket.get(socket.id);
  if (!channelId) return;

  const serverId = voiceServerBySocket.get(socket.id);
  const user = voiceUserBySocket.get(socket.id) || getSocketUser(socket);
  const room = `voice:${channelId}`;
  const wasScreenSharing = screenSharingBySocket.get(socket.id) === true;

  socket.leave(room);
  socket.to(room).emit('voice:user-left', {
    socketId: socket.id,
    userId: user?.id,
  });

  if (wasScreenSharing) {
    socket.to(room).emit('voice:screen', {
      socketId: socket.id,
      userId: user?.id,
      screen: false,
    });
  }

  if (serverId && user) {
    emitRealtimeEvent('voice:member-update', channelId, {
      channelId,
      action: 'leave',
      user,
    });
  }

  voiceChannelBySocket.delete(socket.id);
  voiceServerBySocket.delete(socket.id);
  voiceUserBySocket.delete(socket.id);
  screenSharingBySocket.delete(socket.id);
}

export function registerHandlers(io, socket) {
  const userId = socket.data.user?.id;

  // On connect, join personal user room for DMs
  if (userId) {
    socket.join(`user:${userId}`);
    // Join all server rooms so we can scope presence broadcasts.
    // getState() is cached so this is fast even on every connect.
    (async () => {
      try {
        const state = await getState(userId);
        const serverIds = Array.from(new Set([
          ...(state.channels || []).map((c) => c.serverId).filter(Boolean),
          ...(state.members || []).map((m) => m.serverId).filter(Boolean),
        ]));
        socket.data.serverIds = serverIds;
        for (const serverId of serverIds) socket.join(`server:${serverId}`);
        // Broadcast to every socket in every server this user is in
        for (const serverId of serverIds) {
          emitRealtimeEvent('presence:update', null, { userId, status: 'online' });
        }
      } catch (error) {
        // Handle error gracefully without impacting connection
        console.warn('[socket] Failed to get state for user:', userId, error.message);
      }
    })();
  }

  socket.on('server:join', (serverId) => {
    socket.join(`server:${serverId}`);
  });

  socket.on('channel:join', (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('channel:leave', (channelId) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on('voice:join', async ({ channelId, serverId }) => {
    const user = getSocketUser(socket);
    if (!user || !channelId || !serverId) return;

    // Fetch avatar URL from DB for the joining user
    let avatarUrl = null;
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
      avatarUrl = dbUser?.avatarUrl ?? null;
    } catch { /* ignore */ }

    handleVoiceLeave(io, socket);

    const room = `voice:${channelId}`;
    const existingPeers = [];
    const activeScreenSharers = [];
    const clients = io.sockets.adapter.rooms.get(room);
    if (clients) {
      for (const socketId of clients) {
        if (socketId === socket.id) continue;
        const peerUser = voiceUserBySocket.get(socketId);
        // Fetch avatar for each existing peer
        let peerAvatar = null;
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: peerUser?.id }, select: { avatarUrl: true } });
          peerAvatar = dbUser?.avatarUrl ?? null;
        } catch { /* ignore */ }
        const peerInfo = {
          socketId,
          userId: peerUser?.id,
          username: peerUser?.username || 'Unknown',
          avatarUrl: peerAvatar,
        };
        existingPeers.push(peerInfo);
        if (screenSharingBySocket.get(socketId) === true) {
          activeScreenSharers.push(peerInfo);
        }
      }
    }

    socket.join(room);
    socket.join(`server:${serverId}`);
    voiceChannelBySocket.set(socket.id, channelId);
    voiceServerBySocket.set(socket.id, serverId);
    voiceUserBySocket.set(socket.id, user);

    socket.emit('voice:existing-peers', {
      peers: existingPeers,
      activeScreenSharers,
    });
    socket.to(room).emit('voice:user-joined', {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
      avatarUrl,
    });
    emitRealtimeEvent('voice:member-update', channelId, {
      channelId,
      action: 'join',
      user,
    });
  });

  socket.on('voice:leave', () => {
    handleVoiceLeave(io, socket);
  });

  socket.on('voice:offer', ({ to, offer }) => {
    const user = getSocketUser(socket);
    if (!user || !to || !offer) return;
    emitRealtimeEvent('voice:offer', to, {
      from: socket.id,
      fromUser: user,
      offer,
    });
  });

  socket.on('voice:answer', ({ to, answer }) => {
    if (!to || !answer) return;
    emitRealtimeEvent('voice:answer', to, { from: socket.id, answer });
  });

  socket.on('voice:ice-candidate', ({ to, candidate }) => {
    if (!to || !candidate) return;
    emitRealtimeEvent('voice:ice-candidate', to, { from: socket.id, candidate });
  });

  socket.on('voice:mute', ({ muted }) => {
    const channelId = voiceChannelBySocket.get(socket.id);
    const user = getSocketUser(socket);
    if (!channelId || !user) return;
    emitRealtimeEvent('voice:user-muted', channelId, {
      socketId: socket.id,
      userId: user.id,
      muted: Boolean(muted),
    });
  });

  socket.on('voice:deafen', ({ deafened }) => {
    const channelId = voiceChannelBySocket.get(socket.id);
    const user = getSocketUser(socket);
    if (!channelId || !user) return;
    emitRealtimeEvent('voice:user-deafened', channelId, {
      socketId: socket.id,
      userId: user.id,
      deafened: Boolean(deafened),
    });
  });

  socket.on('voice:speaking', ({ speaking }) => {
    const channelId = voiceChannelBySocket.get(socket.id);
    const user = getSocketUser(socket);
    if (!channelId || !user) return;
    socket.to(`voice:${channelId}`).emit('voice:user-speaking', {
      socketId: socket.id,
      userId: user.id,
      speaking: Boolean(speaking),
    });
  });

  socket.on('voice:screen', ({ screen }) => {
    const channelId = voiceChannelBySocket.get(socket.id);
    const user = getSocketUser(socket);
    if (!channelId || !user) return;
    const enabled = Boolean(screen);
    screenSharingBySocket.set(socket.id, enabled);
    emitRealtimeEvent('voice:screen', channelId, {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
      screen: enabled,
    });
  });

  socket.on('voice:screen-request', ({ to }) => {
    // Late joiner asks an active screen sharer to renegotiate so it can
    // receive the screen track. The sharer is expected to send a fresh offer.
    if (!to) return;
    const sharerId = to;
    const sharer = voiceUserBySocket.get(sharerId);
    if (!sharer || screenSharingBySocket.get(sharerId) !== true) return;
    emitRealtimeEvent('voice:screen-request', sharerId, {
      from: socket.id,
      fromUser: getSocketUser(socket),
    });
  });

  // Amplitude relay — throttle to 10Hz server-side to prevent floods
  const AMPLITUDE_COOLDOWN_MS = 100;
  let lastAmplitudeRelay = 0;
  socket.on('voice:amplitude', ({ amplitude }) => {
    const now = Date.now();
    if (now - lastAmplitudeRelay < AMPLITUDE_COOLDOWN_MS) return;
    lastAmplitudeRelay = now;
    const channelId = voiceChannelBySocket.get(socket.id);
    if (!channelId) return;
    socket.to(`voice:${channelId}`).emit('voice:amplitude', {
      socketId: socket.id,
      amplitude: Number(amplitude) || 0,
    });
  });

  // Camera toggle broadcast
  socket.on('voice:video', ({ video }) => {
    const channelId = voiceChannelBySocket.get(socket.id);
    const user = getSocketUser(socket);
    if (!channelId || !user) return;
    emitRealtimeEvent('voice:user-video', channelId, {
      socketId: socket.id,
      userId: user.id,
      video: Boolean(video),
    });
  });

  // Screen share emoji reactions
  socket.on('screen:reaction', ({ emoji, x, y, channelId }) => {
    if (!userId || !emoji || !channelId) return;
    emitRealtimeEvent('screen:reaction', channelId, {
      userId,
      emoji,
      x: Number(x) || 0,
      y: Number(y) || 0,
    });
  });

  socket.on('message:send', async ({ channelId, content, parentId, attachments }) => {
    if (!userId) return;
    if (await isRateLimited(userId, 'message:send')) return;
    try {
      const atts = normalizeAttachments(attachments);
      const base = {
        channelId,
        body: sanitize(String(content || '')),
        parentId,
        attachments: atts.length ? atts : undefined,
      };
      // Never-throw safety net: if the socket user id doesn't resolve in the DB
      // (e.g. a stale in-memory `demo-<ts>` id from when the database was briefly
      // unreachable), the FK on Message.userId throws Prisma P2003. Retry as an
      // anonymous message via authorOverride so the message always persists and
      // broadcasts. (Once auth is healthy this branch is dormant.)
      let message;
      try {
        message = await prisma.message.create({
          data: { ...base, userId },
          include: { author: true },
        });
      } catch (createErr) {
        const code = createErr?.code || createErr?.constructor?.name;
        console.warn(`[socket] message:send create with userId=${userId} failed (${code}); retrying as anonymous`);
        message = await prisma.message.create({
          data: {
            ...base,
            userId: null,
            authorOverride: socket.data.user?.username || 'Guest',
          },
          include: { author: true },
        });
      }
      emitRealtimeEvent('message:new', channelId, { message }).catch(() => {});
      io.to(`channel:${channelId}`).emit('message:new', { message });

      // Deliver to registered outgoing webhooks (non-blocking)
      deliverWebhooks(channelId, message).catch(err => {
        console.error('[webhook] delivery error:', err.message);
      });
    } catch (e) { console.error('Error sending message:', e); }
  });

  socket.on('message:edit', async ({ messageId, content }) => {
    if (!userId) return;
    try {
      // Check if the message belongs to this user (including anonymous fallback messages).
      // Moderators (FOUNDER/ADMIN/MODERATOR) in the channel's server may also edit.
      const existing = await prisma.message.findUnique({
        where: { id: messageId },
        include: { channel: true },
      });
      if (!existing || existing.deleted) return;
      const myUsername = socket.data.user?.username;
      const isOwner = existing.userId
        ? existing.userId === userId
        : existing.authorOverride === myUsername;
      let isModerator = false;
      if (!isOwner && existing.channel?.serverId) {
        const member = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId: existing.channel.serverId, userId } },
        });
        isModerator = !!member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
      }
      if (!isOwner && !isModerator) return;

      const message = await prisma.message.update({
        where: { id: messageId },
        data: { body: sanitize(String(content || '')), edited: true },
        include: { author: true, reactions: true, parentMessage: true }
      });
      const channelId = message.channelId;
      emitRealtimeEvent('message:updated', channelId, { message });
      io.to(`channel:${channelId}`).emit('message:updated', { message });

      // Audit log when a moderator edits someone else's message.
      if (isModerator && !isOwner && existing.channel?.serverId) {
        prisma.auditLog.create({
          data: {
            serverId: existing.channel.serverId,
            userId,
            action: 'MESSAGE_EDIT',
            targetId: messageId,
            details: { by: 'moderator' },
          },
        }).catch((e) => console.warn('[audit] socket message edit log failed:', e?.message));
      }
    } catch (e) { console.error('Error editing message:', e); }
  });

  socket.on('message:delete', async ({ messageId }) => {
    if (!userId) return;
    try {
      // Same author-or-moderator permission as the HTTP route.
      const existing = await prisma.message.findUnique({
        where: { id: messageId },
        include: { channel: true },
      });
      if (!existing || existing.deleted) return;
      const myUsername = socket.data.user?.username;
      const isOwner = existing.userId
        ? existing.userId === userId
        : existing.authorOverride === myUsername;
      let isModerator = false;
      if (!isOwner && existing.channel?.serverId) {
        const member = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId: existing.channel.serverId, userId } },
        });
        isModerator = !!member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
      }
      if (!isOwner && !isModerator) return;

      const message = await prisma.message.update({
        where: { id: messageId },
        data: { deleted: true, body: '', attachments: null }
      });
      const channelId = message.channelId;
      emitRealtimeEvent('message:deleted', channelId, { messageId, channelId });
      io.to(`channel:${channelId}`).emit('message:deleted', { messageId, channelId });

      // Audit log when a moderator deletes someone else's message.
      if (isModerator && !isOwner && existing.channel?.serverId) {
        prisma.auditLog.create({
          data: {
            serverId: existing.channel.serverId,
            userId,
            action: 'MESSAGE_DELETE',
            targetId: messageId,
            details: { by: 'moderator' },
          },
        }).catch((e) => console.warn('[audit] socket message delete log failed:', e?.message));
      }
    } catch (e) { console.error('Error deleting message:', e); }
  });

  socket.on('message:react', async ({ messageId, emoji }) => {
    if (!userId) return;
    if (await isRateLimited(userId, 'message:react')) return;
    try {
      const existing = await prisma.reaction.findUnique({
        where: { messageId_userId_emoji: { messageId, userId, emoji } }
      });
      
      if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.reaction.create({ data: { messageId, userId, emoji } });
      }

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { author: true, reactions: true, parentMessage: true }
      });
      const channelId = message.channelId;
      emitRealtimeEvent('message:updated', channelId, { message });
      io.to(`channel:${channelId}`).emit('message:updated', { message });
    } catch (e) { console.error('Error reacting:', e); }
  });

  socket.on('typing:start', async ({ channelId }) => {
    if (!userId) return;
    // Skip rate limiting for typing when Redis is not configured to reduce latency
    if (await isRateLimited(userId, 'typing:start')) return;
    const username = socket.data.user.username;
    socket.to(`channel:${channelId}`).emit('typing:start', { userId, username, channelId });
  });

  socket.on('typing:stop', ({ channelId }) => {
    if (!userId) return;
    socket.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId });
  });

  socket.on('dm:send', async ({ recipientId, content, attachments }, ack) => {
    if (!userId) {
      if (typeof ack === 'function') ack({ error: 'Not authenticated' });
      socket.emit('dm:error', { error: 'Not authenticated' });
      return;
    }
    if (await isRateLimited(userId, 'dm:send')) {
      if (typeof ack === 'function') ack({ error: 'You are sending messages too fast.' });
      socket.emit('dm:error', { error: 'You are sending messages too fast.' });
      return;
    }
    try {
      const atts = normalizeAttachments(attachments);
      let recipient = String(recipientId || '');
      // If the client sent a full dmId (with underscores in IDs), extract the
      // other user by removing our own ID and stripping separator underscores.
      if (recipient.includes(userId)) {
        recipient = recipient.replace(userId, '').replace(/^_+|_+$/g, '');
      }
      if (!recipient || recipient === userId) {
        if (typeof ack === 'function') ack({ error: 'Invalid recipient' });
        socket.emit('dm:error', { error: 'Invalid recipient' });
        return;
      }

      // Block check — either party may have blocked the other.
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { userId, blockedId: recipient },
            { userId: recipient, blockedId: userId },
          ],
        },
      });
      if (block) {
        if (typeof ack === 'function') ack({ error: 'Cannot send messages to this user.' });
        socket.emit('dm:error', { error: 'Cannot send messages to this user.' });
        return;
      }

      // Validate content — don't allow empty messages with no attachments
      const text = sanitize(String(content || ''));
      if (!text && atts.length === 0) {
        if (typeof ack === 'function') ack({ error: 'Message cannot be empty' });
        socket.emit('dm:error', { error: 'Message cannot be empty' });
        return;
      }

      const dmId = [userId, recipient].sort().join('_');
      const message = await prisma.dmMessage.create({
        data: {
          content: text,
          attachments: atts.length ? atts : undefined,
          dmId,
          senderId: userId,
          recipientId: recipient,
        },
        include: { sender: true, recipient: true }
      });
      // Deliver to the recipient's personal room so they get the message live
      // even when offline from Redis/bridge and without joining the dm room.
      io.to(`user:${recipient}`).emit('dm:new', { message });
      io.to(`user:${userId}`).emit('dm:new', { message });
      socket.emit('dm:new', { message });
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      console.error('Error sending DM:', e?.code || e?.message);
      if (typeof ack === 'function') ack({ error: 'Failed to send message. Please try again.' });
      socket.emit('dm:error', { error: 'Failed to send message. Please try again.' });
    }
  });

  socket.on('dm:join', ({ dmId }) => {
    socket.join(`dm:${dmId}`);
  });

  socket.on('dm:leave', ({ dmId }) => {
    socket.leave(`dm:${dmId}`);
  });

  socket.on('dm:typing:start', async ({ recipientId }) => {
    if (!userId) return;
    // Skip rate limiting for typing when Redis is not configured to reduce latency
    if (await isRateLimited(userId, 'dm:typing:start')) return;
    const username = socket.data.user?.username;
    const dmId = [userId, recipientId].sort().join('_');
    socket.to(`user:${recipientId}`).emit('dm:typing:start', { userId, username, dmId });
  });

  socket.on('dm:typing:stop', ({ recipientId }) => {
    if (!userId) return;
    const dmId = [userId, recipientId].sort().join('_');
    socket.to(`user:${recipientId}`).emit('dm:typing:stop', { userId, dmId });
  });

  socket.on('dm:read', async ({ dmId }) => {
    if (!userId) return;
    try {
      await prisma.dmMessage.updateMany({
        where: { dmId, recipientId: userId, read: false },
        data: { read: true },
      });
      const otherId = dmId.replace(userId, '').replace(/^_+|_+$/g, '');
      if (otherId) {
        io.to(`user:${otherId}`).emit('dm:read', { dmId, by: userId });
        emitRealtimeEvent('dm:read', dmId, { dmId, by: userId });
      }
    } catch (e) { console.error('Error marking DM read:', e); }
  });

  socket.on('status:update', async ({ status }) => {
    if (!userId) return;
    const normalized = String(status || '').toUpperCase();
    const VALID = ['ONLINE', 'IDLE', 'DND', 'OFFLINE'];
    if (!VALID.includes(normalized)) return;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status: normalized },
      });
      // Scope to all server rooms this user is in (set during connect)
      const serverIds = socket.data.serverIds || [];
      const lowercase = normalized.toLowerCase();
      for (const serverId of serverIds) {
        emitRealtimeEvent('presence:update', null, { userId, status: lowercase });
      }
    } catch (e) { console.error('Error updating status:', e); }
  });

  socket.on('disconnect', async () => {
    handleVoiceLeave(io, socket);
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'OFFLINE' }
        });
        // Scope to all server rooms this user was in
        const serverIds = socket.data.serverIds || [];
        for (const serverId of serverIds) {
          emitRealtimeEvent('presence:update', null, { userId, status: 'offline' });
        }
      } catch (e) { console.error('Error on disconnect:', e); }
    }
  });
}
