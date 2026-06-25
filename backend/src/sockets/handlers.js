import { prisma } from '../lib/prisma.js';
import { emitAll } from './index.js';

// Defensive attachment coercion shared by channel + DM socket sends.
const ALLOWED_ATTACHMENT_KINDS = new Set(['image', 'video', 'file']);
function normalizeAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      url: String(a.url || '').slice(0, 1024),
      kind: ALLOWED_ATTACHMENT_KINDS.has(a.kind) ? a.kind : 'file',
      name: String(a.name || 'file').slice(0, 200),
      size: Number.isFinite(Number(a.size)) ? Number(a.size) : 0,
      mime: String(a.mime || '').slice(0, 200),
    }))
    .filter((a) => a.url)
    .slice(0, 10);
}

export function registerHandlers(io, socket) {
  const userId = socket.data.user?.id;

  // On connect, join personal user room for DMs
  if (userId) {
    socket.join(`user:${userId}`);
    // Broadcast presence
    io.emit('presence:update', { userId, status: 'online' });
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

  socket.on('message:send', async ({ channelId, content, parentId, attachments }) => {
    if (!userId) return;
    try {
      const atts = normalizeAttachments(attachments);
      const base = {
        channelId,
        body: String(content || ''),
        parentId,
        attachments: atts.length ? atts : undefined,
      };
      // Never-throw safety net: if the socket user id doesn't resolve in the DB
      // (e.g. a stale in-memory `demo-<ts>` id from when MySQL was briefly
      // unreachable), the FK on Message.userId throws Prisma P2003. Retry as an
      // anonymous message via authorOverride so the message always persists and
      // broadcasts. (Once auth is healthy this branch is dormant.)
      let message;
      try {
        message = await prisma.message.create({
          data: { ...base, userId },
          include: { author: true, reactions: true, parent: true },
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
          include: { author: true, reactions: true, parent: true },
        });
      }
      io.to(`channel:${channelId}`).emit('message:new', { message });
    } catch (e) { console.error('Error sending message:', e); }
  });

  socket.on('message:edit', async ({ messageId, content }) => {
    if (!userId) return;
    try {
      const message = await prisma.message.update({
        where: { id: messageId, userId },
        data: { body: content, edited: true },
        include: { author: true, reactions: true, parent: true }
      });
      const channelId = message.channelId;
      io.to(`channel:${channelId}`).emit('message:updated', { message });
    } catch (e) { console.error('Error editing message:', e); }
  });

  socket.on('message:delete', async ({ messageId }) => {
    if (!userId) return;
    try {
      const message = await prisma.message.update({
        where: { id: messageId, userId },
        data: { deleted: true, body: '' }
      });
      const channelId = message.channelId;
      io.to(`channel:${channelId}`).emit('message:deleted', { messageId, channelId });
    } catch (e) { console.error('Error deleting message:', e); }
  });

  socket.on('message:react', async ({ messageId, emoji }) => {
    if (!userId) return;
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
        include: { author: true, reactions: true, parent: true }
      });
      const channelId = message.channelId;
      io.to(`channel:${channelId}`).emit('message:updated', { message });
    } catch (e) { console.error('Error reacting:', e); }
  });

  socket.on('typing:start', ({ channelId }) => {
    if (!userId) return;
    const username = socket.data.user.username;
    socket.to(`channel:${channelId}`).emit('typing:start', { userId, username, channelId });
  });

  socket.on('typing:stop', ({ channelId }) => {
    if (!userId) return;
    socket.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId });
  });

  socket.on('dm:send', async ({ recipientId, content, attachments }) => {
    if (!userId) return;
    try {
      const atts = normalizeAttachments(attachments);
      // Coerce recipientId out of whatever the client sent. The frontend
      // historically passed the full `userId1_userId2` dmId here by mistake; if
      // so, recover the actual recipient by dropping our own id from the string.
      let recipient = String(recipientId || '');
      if (recipient.includes('_')) {
        recipient = recipient.split('_').find((part) => part && part !== userId) || recipient;
      }
      if (!recipient || recipient === userId) return;

      const dmId = [userId, recipient].sort().join('_');
      const message = await prisma.dMMessage.create({
        data: {
          content: String(content || ''),
          attachments: atts.length ? atts : undefined,
          dmId,
          senderId: userId,
          recipientId: recipient,
        },
        include: { sender: true, recipient: true }
      });
      io.to(`user:${recipient}`).emit('dm:new', { message });
      socket.emit('dm:new', { message });
    } catch (e) {
      // DM model has no anonymous/override field, so a FK failure on a stale
      // sender id can't be retried. We log and swallow — the socket path never
      // surfaces an error to the client. (Dormant once auth is healthy.)
      console.error('Error sending DM:', e?.code || e?.message);
    }
  });

  socket.on('status:update', async ({ status }) => {
    if (!userId) return;
    // Validate against the Status enum so a bad/missing value can't throw on
    // .toUpperCase() or write an invalid enum (Prisma would reject it anyway).
    const normalized = String(status || '').toUpperCase();
    const VALID = ['ONLINE', 'IDLE', 'DND', 'OFFLINE'];
    if (!VALID.includes(normalized)) return;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status: normalized },
      });
      // Emit the lowercase form the client renders by (see StatusDot/mapMember).
      io.emit('presence:update', { userId, status: normalized.toLowerCase() });
    } catch (e) { console.error('Error updating status:', e); }
  });

  socket.on('disconnect', async () => {
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'OFFLINE' }
        });
        io.emit('presence:update', { userId, status: 'offline' });
      } catch (e) { console.error('Error on disconnect:', e); }
    }
  });
}
