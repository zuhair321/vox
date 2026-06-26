// Message routes.
//   POST /api/messages  → create a message (authed as self, or anonymous guest)
//   POST /api/messages/:id/reactions → toggle a reaction (authed only)
import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { createMessage } from '../services/chat.service.js';
import { mapMessage } from '../lib/mappers.js';
import { emitAll } from '../sockets/index.js';

export const messageRouter = Router();

const CHANNEL_MESSAGE_INCLUDE = {
  author: true,
  reactions: true,
  parent: { include: { author: true, reactions: true } },
};

// Coerce a client-supplied attachments payload into a clean array of
// { url, kind, name, size, mime } objects. Defensive: the JSON column stores
// whatever we hand it, so we never trust the shape from the wire blindly.
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
    .slice(0, 10); // cap attachments per message
}

messageRouter.get('/channels/:channelId/messages', requireAuth, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const messages = await prisma.message.findMany({
      where: { channelId, deleted: false },
      include: CHANNEL_MESSAGE_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json(messages);
  } catch (e) { next(e); }
});

messageRouter.post('/channels/:channelId/messages', requireAuth, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const content = String(req.body?.content || req.body?.body || '').trim();
    const attachments = normalizeAttachments(req.body?.attachments);
    if (!content && attachments.length === 0) {
      throw new HttpError(400, 'Message body or attachment is required.');
    }

    // Never-500 safety net. If the authed user id doesn't resolve (e.g. a stale
    // in-memory `demo-<ts>` id minted while the DB was briefly unreachable at
    // boot), `prisma.message.create` throws Prisma P2003 (foreign-key violation
    // on Message.userId → User.id). Rather than surfacing that as a 500 and
    // dropping the message (the original silent-send bug), we retry once as an
    // anonymous message via `authorOverride` — the existing guest path — so the
    // message always lands.
    const baseData = {
      channelId,
      body: content.slice(0, 2000),
      parentId: req.body?.parentId || null,
      attachments: attachments.length ? attachments : undefined,
    };

    let message;
    try {
      message = await prisma.message.create({
        data: { ...baseData, userId: req.user.id },
        include: CHANNEL_MESSAGE_INCLUDE,
      });
    } catch (createErr) {
      // P2003 = FK violation; also cover P2002/other create failures defensively.
      const code = createErr?.code || createErr?.constructor?.name;
      console.warn(`[messages] create with userId=${req.user.id} failed (${code}); retrying as anonymous`);
      message = await prisma.message.create({
        data: {
          ...baseData,
          userId: null,
          authorOverride: req.user?.username || 'Guest',
        },
        include: CHANNEL_MESSAGE_INCLUDE,
      });
    }

    emitAll('message:new', { message });
    res.status(201).json({ message });
  } catch (e) { next(e); }
});

messageRouter.post('/messages', optionalAuth, async (req, res, next) => {
  try {
    const { channelId, author, body } = req.body || {};
    const attachments = normalizeAttachments(req.body?.attachments);
    const message = await createMessage({ channelId, author, body, user: req.user, attachments });
    const mapped = mapMessage(message);
    // Broadcast in the SAME envelope + raw shape the socket listener and
    // MessageArea expect: `{ message }` with `userId`/`author` object/`reactions`
    // array. The old code emitted the bare *mapped* object (author as a string,
    // no `message` wrapper), so this listener read `message` as undefined and
    // the channel/own-message detection broke for anything using this route.
    emitAll('message:new', { message });
    res.status(201).json(mapped);
  } catch (e) { next(e); }
});

// Toggle a reaction on/off for the authed user. Toggling keeps counts honest:
// a user can add a reaction only once, and remove it by reacting again.
messageRouter.post('/messages/:id/reactions', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const emoji = String(req.body?.emoji || '').trim();
    if (!emoji) throw new HttpError(400, 'emoji is required.');

    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId: req.user.id, emoji },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: { messageId, userId: req.user.id, emoji },
      });
    }

    // Re-fetch the message with fresh reactions and broadcast.
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { author: true, reactions: true },
    });
    const mapped = mapMessage(message);
    emitAll('message:reactions', mapped);
    res.json(mapped);
  } catch (e) { next(e); }
});

// Pin / unpin a message (toggle). Only FOUNDER/ADMIN/MODERATOR may pin.
// Broadcasts a 'message:pinned' socket event so every client updates its
// pinned panel, and the value is reflected on the message row itself.
messageRouter.post('/messages/:id/pin', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true, author: true },
    });
    if (!message || message.deleted) throw new HttpError(404, 'Message not found.');

    // Moderator check: resolve the requester's role within the channel's server.
    if (message.channel?.serverId) {
      const member = await prisma.serverMember.findUnique({
        where: {
          serverId_userId: { serverId: message.channel.serverId, userId: req.user.id },
        },
      });
      const allowed = member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
      if (!allowed) throw new HttpError(403, 'Only moderators may pin messages.');
    }

    const nextPinned = !message.pinned;
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { pinned: nextPinned },
      include: { author: true, reactions: true, parent: { include: { author: true } } },
    });

    emitAll('message:pinned', {
      message: {
        id: updated.id,
        channelId: updated.channelId,
        body: updated.body,
        author: updated.author?.displayName ?? updated.authorOverride ?? 'Guest',
        avatarUrl: updated.author?.avatarUrl ?? null,
        createdAt: updated.createdAt.toISOString(),
        pinned: updated.pinned,
      },
      pinned: updated.pinned,
      channelId: updated.channelId,
      by: req.user.username,
    });

    res.json({ pinned: updated.pinned, message: updated });
  } catch (e) { next(e); }
});

// Delete a message (soft delete). The user must be the author.
messageRouter.delete('/messages/:id', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const message = await prisma.message.update({
      where: { id: messageId, userId: req.user.id },
      data: { deleted: true, body: '' },
      include: CHANNEL_MESSAGE_INCLUDE,
    });
    emitAll('message:deleted', { messageId, channelId: message.channelId });
    res.json({ ok: true, message });
  } catch (e) { next(e); }
});

// Edit a message. The user must be the author.
messageRouter.patch('/messages/:id', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const body = String(req.body?.body || req.body?.content || '').trim();
    if (!body) throw new HttpError(400, 'Message body is required.');
    const message = await prisma.message.update({
      where: { id: messageId, userId: req.user.id },
      data: { body: body.slice(0, 2000), edited: true },
      include: CHANNEL_MESSAGE_INCLUDE,
    });
    emitAll('message:updated', { message });
    res.json({ ok: true, message });
  } catch (e) { next(e); }
});
messageRouter.get('/channels/:channelId/messages/pinned', requireAuth, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const messages = await prisma.message.findMany({
      where: { channelId, pinned: true, deleted: false },
      include: { author: true, reactions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
  } catch (e) { next(e); }
});
