// Edit/delete handlers for server channels.
//   POST /api/messages/:id/edit   → edit body
//   DELETE /api/messages/:id       → soft delete
//   Both broadcast via socket so all clients update.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { emitAll } from '../sockets/index.js';

export const editRouter = Router();

const CHANNEL_MESSAGE_INCLUDE = {
  author: true,
  reactions: true,
  parent: { include: { author: true, reactions: true } },
};

editRouter.patch('/messages/:id', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const body = String(req.body?.body || req.body?.content || '').trim();
    if (!body) throw new HttpError(400, 'Message body is required.');

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!existing) throw new HttpError(404, 'Message not found.');
    if (existing.deleted) throw new HttpError(410, 'Message already deleted.');

    // Must be the author. If the message has a null userId (anonymous fallback
    // from when MySQL was briefly down), we only allow editing if the socket's
    // authorOverride matches the current user's username. Otherwise, require a
    // matching userId.
    const myId = req.user.id;
    const myUsername = req.user.username;
    const isOwner = existing.userId
      ? existing.userId === myId
      : existing.authorOverride === myUsername;
    if (!isOwner) throw new HttpError(403, 'You can only edit your own messages.');

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { body: body.slice(0, 2000), edited: true },
      include: CHANNEL_MESSAGE_INCLUDE,
    });
    emitAll('message:updated', { message });
    res.json({ ok: true, message });
  } catch (e) { next(e); }
});

editRouter.delete('/messages/:id', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!existing) throw new HttpError(404, 'Message not found.');
    if (existing.deleted) throw new HttpError(410, 'Message already deleted.');

    const myId = req.user.id;
    const myUsername = req.user.username;
    const isOwner = existing.userId
      ? existing.userId === myId
      : existing.authorOverride === myUsername;
    if (!isOwner) throw new HttpError(403, 'You can only delete your own messages.');

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { deleted: true, body: '' },
      include: CHANNEL_MESSAGE_INCLUDE,
    });
    emitAll('message:deleted', { messageId, channelId: message.channelId });
    res.json({ ok: true, message });
  } catch (e) { next(e); }
});
