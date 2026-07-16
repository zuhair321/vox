import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { getIO } from '../sockets/index.js';
import { sanitize } from '../middleware/sanitize.js';
import { emitRealtimeEvent } from '../lib/redis_bridge.js';
import { normalizeAttachments } from '../lib/attachments.js';

export const dmRouter = Router();

// GET /api/dms — list all DMs for the current user
dmRouter.get('/dms', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find all DMs where user is either sender or recipient
    const sentDMs = await prisma.dmMessage.findMany({
      where: { senderId: userId },
      select: { dmId: true },
      distinct: ['dmId'],
    });

    const receivedDMs = await prisma.dmMessage.findMany({
      where: { recipientId: userId },
      select: { dmId: true },
      distinct: ['dmId'],
    });

    // Combine and deduplicate dmIds
    const allDmIds = [...new Set([
      ...sentDMs.map(d => d.dmId),
      ...receivedDMs.map(d => d.dmId),
    ])];

    if (allDmIds.length === 0) {
      return res.json([]);
    }

    // Batch all DB queries to avoid N+1
    const otherIds = allDmIds.map(dmId => dmId.replace(userId, '').replace(/^_+|_+$/g, ''));
    const uniqueOtherIds = [...new Set(otherIds)];

    const [usersMap, lastMessages, unreadCounts] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: uniqueOtherIds } },
        select: { id: true, username: true, displayName: true, avatarUrl: true, status: true, color: true },
      }).then(users => Object.fromEntries(users.map(u => [u.id, u]))),
      prisma.dmMessage.findMany({
        where: { dmId: { in: allDmIds } },
        orderBy: { createdAt: 'desc' },
        select: { dmId: true, content: true, createdAt: true, senderId: true },
      }).then(messages => {
        const map = new Map();
        for (const m of messages) {
          if (!map.has(m.dmId)) map.set(m.dmId, m);
        }
        return map;
      }),
      prisma.dmMessage.groupBy({
        by: ['dmId'],
        where: { dmId: { in: allDmIds }, recipientId: userId, read: false },
        _count: { _all: true },
      }).then(result => Object.fromEntries(result.map(r => [r.dmId, r._count._all]))),
    ]);

    const dms = allDmIds.map(dmId => {
      const otherUser = usersMap[dmId.replace(userId, '').replace(/^_+|_+$/g, '')];
      const lastMessage = lastMessages.get(dmId);
      return {
        dmId,
        otherUser,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          senderId: lastMessage.senderId,
        } : null,
        unreadCount: unreadCounts[dmId] || 0,
      };
    });

    // Sort by last message date
    dms.sort((a, b) => {
      const aDate = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
      const bDate = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
      return bDate - aDate;
    });

    res.json({ dms });
  } catch (e) { next(e); }
});

// Rate limit DM sends to prevent spam.
const dmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are sending messages too fast. Please slow down.' },
});

// Fetch DM history
dmRouter.get('/dm/:dmId/messages', requireAuth, async (req, res, next) => {
  try {
    const dmId = req.params.dmId;
    // Verify the user is part of this DM. Use substring matching because
    // user IDs may contain underscores (e.g. usr_founder_zuhair) which
    // would break a split('_') approach.
    if (!dmId.includes(req.user.id)) throw new HttpError(403, 'Not authorized');

    const messages = await prisma.dmMessage.findMany({
      where: { dmId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bannerUrl: true,
            status: true,
            color: true,
            hasTurbo: true,
            turboSince: true
          }
        },
        recipient: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bannerUrl: true,
            status: true,
            color: true,
            hasTurbo: true,
            turboSince: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    // Return them in chronological order
    res.json(messages.reverse());
  } catch (e) { next(e); }
});

// Send a DM (HTTP fallback)
dmRouter.post('/dm/:dmId/messages', requireAuth, dmLimiter, async (req, res, next) => {
  try {
    const dmId = req.params.dmId;
    const content = sanitize(String(req.body?.content || ''));
    const attachments = normalizeAttachments(req.body?.attachments);

    if (!dmId.includes(req.user.id)) throw new HttpError(403, 'Not authorized');
    if (!content && attachments.length === 0) throw new HttpError(400, 'Content or attachment is required');

    // dmId is the two participant ids joined by '_' (sorted). Recover the
    // recipient by dropping our own id from the string.
    const recipientId = dmId.replace(req.user.id, '').replace(/^_+|_+$/g, '');
    if (!recipientId) throw new HttpError(400, 'Invalid DM channel.');

    // Block check
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { userId: req.user.id, blockedId: recipientId },
          { userId: recipientId, blockedId: req.user.id },
        ],
      },
    });
    if (block) throw new HttpError(403, 'Cannot send messages to this user.');

    const message = await prisma.dmMessage.create({
      data: {
        content: String(content || ''),
        attachments: attachments.length ? attachments : undefined,
        dmId,
        senderId: req.user.id,
        recipientId
      },
      include: {
        sender: true,
        recipient: true
      }
    });

    // Mirror the socket path: deliver to both participants' personal rooms so
    // an HTTP-sent DM still shows up live for the recipient and the sender.
    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('dm:new', { message });
      io.to(`user:${req.user.id}`).emit('dm:new', { message });
    }
    emitRealtimeEvent('dm:new', dmId, { message });

    res.status(201).json({ message });
  } catch (e) { next(e); }
});

// Edit a DM message (sender only)
dmRouter.patch('/dm/:dmId/messages/:messageId', requireAuth, dmLimiter, async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const body = sanitize(String(req.body?.content || req.body?.body || ''));
    if (!body) throw new HttpError(400, 'Content required');

    const existing = await prisma.dmMessage.findUnique({ where: { id: messageId } });
    if (!existing) throw new HttpError(404, 'Message not found');
    if (existing.senderId !== req.user.id) throw new HttpError(403, 'You can only edit your own DMs');
    if (existing.deleted) throw new HttpError(410, 'Message already deleted');

    const updated = await prisma.dmMessage.update({
      where: { id: messageId },
      data: { content: body.slice(0, 2000), edited: true },
      include: { sender: true, recipient: true },
    });

    const io = getIO();
    if (io) {
      io.to(`user:${updated.senderId}`).emit('dm:updated', { message: updated });
      io.to(`user:${updated.recipientId}`).emit('dm:updated', { message: updated });
    }
    emitRealtimeEvent('dm:updated', dmId, { message: updated });

    res.json({ ok: true, message: updated });
  } catch (e) { next(e); }
});

// Delete a DM message (sender only, soft delete)
dmRouter.delete('/dm/:dmId/messages/:messageId', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.messageId;

    const existing = await prisma.dmMessage.findUnique({ where: { id: messageId } });
    if (!existing) throw new HttpError(404, 'Message not found');
    if (existing.senderId !== req.user.id) throw new HttpError(403, 'You can only delete your own DMs');
    if (existing.deleted) throw new HttpError(410, 'Message already deleted');

    const deleted = await prisma.dmMessage.update({
      where: { id: messageId },
      data: { deleted: true, content: '' },
      include: { sender: true, recipient: true },
    });

    const io = getIO();
    if (io) {
      io.to(`user:${deleted.senderId}`).emit('dm:deleted', { messageId: deleted.id, dmId: deleted.dmId });
      io.to(`user:${deleted.recipientId}`).emit('dm:deleted', { messageId: deleted.id, dmId: deleted.dmId });
    }
    emitRealtimeEvent('dm:deleted', dmId, { messageId: deleted.id, dmId: deleted.dmId });

    res.json({ ok: true, message: deleted });
  } catch (e) { next(e); }
});
