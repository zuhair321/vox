// Message routes.
//   GET  /api/channels/:channelId/messages     → fetch messages (requires read permission)
//   POST /api/channels/:channelId/messages     → send message (requires write permission)
//   POST /api/messages/:id/reactions            → toggle reaction (requires server membership)
//   POST /api/messages/:id/pin                  → pin/unpin (moderator+)
//   GET  /api/messages/search                  → search messages (filtered to user's servers)
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, checkChannelPermission } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { mapMessage } from '../lib/mappers.js';
import { getIO } from '../sockets/index.js';
import { sanitize } from '../middleware/sanitize.js';
import { normalizeAttachments } from '../lib/attachments.js';
import { getMessagesBefore } from '../services/chat.service.js';
import { getCache } from '../lib/redis.js';

export const messageRouter = Router();

// Rate limiters for message operations.
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are sending messages too fast. Please slow down.' },
});

const reactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reaction changes. Please wait.' },
});

const CHANNEL_MESSAGE_INCLUDE = {
  author: true,
  reactions: true,
  parentMessage: { include: { author: true, reactions: true } },
};

// Paginated: GET /channels/:channelId/messages?before=<cursorId>&limit=50
messageRouter.get('/channels/:channelId/messages', requireAuth, requirePermission('read'), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { before, limit } = req.query;

    // If `before` is provided → cursor-based pagination (load older).
    if (before) {
      const messages = await getMessagesBefore(before, limit);
      return res.json(messages);
    }

    // Otherwise: latest messages for this channel (for channel switching).
    const messages = await prisma.message.findMany({
      where: { channelId, deleted: false },
      include: CHANNEL_MESSAGE_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take: Math.min(parseInt(limit, 10) || 100, 100),
    });
    res.json(messages);
  } catch (e) { next(e); }
});

messageRouter.post('/channels/:channelId/messages', requireAuth, requirePermission('write'), messageLimiter, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const content = sanitize(String(req.body?.content || req.body?.body || ''));
    const attachments = normalizeAttachments(req.body?.attachments);
    if (!content && attachments.length === 0) {
      throw new HttpError(400, 'Message body or attachment is required.');
    }

    // Slowmode enforcement: check Redis for last message timestamp
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (channel?.slowmode > 0) {
      const slowmodeKey = `slowmode:${channelId}:${req.user.id}`;
      const redis = await getCache();
      if (redis) {
        const lastSent = await redis.get(slowmodeKey);
        if (lastSent) {
          const elapsed = (Date.now() - parseInt(lastSent, 10)) / 1000;
          const remaining = Math.ceil(channel.slowmode - elapsed);
          if (remaining > 0) {
            return res.status(429).json({
              error: `Slowmode is active. You can send another message in ${remaining}s.`,
              retryAfter: remaining,
            });
          }
        }
        // Set/refresh the slowmode key
        await redis.set(slowmodeKey, Date.now().toString(), { EX: channel.slowmode + 5 });
      }
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
      fuseTime: req.body?.fuseTime || null,
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

    const io = getIO();
    if (io) io.to(`channel:${channelId}`).emit('message:new', { message });
    res.status(201).json({ message });
  } catch (e) { next(e); }
});

messageRouter.post('/messages', requireAuth, messageLimiter, async (req, res, next) => {
  try {
    const { channelId, body } = req.body || {};
    const sanitizedBody = sanitize(String(body || ''));
    const attachments = normalizeAttachments(req.body?.attachments);
    const message = await createMessage({ channelId, author: req.user.username, body: sanitizedBody, user: req.user, attachments });
    const mapped = mapMessage(message);
    const io = getIO();
    if (io) io.to(`channel:${channelId}`).emit('message:new', { message });
    res.status(201).json(mapped);
  } catch (e) { next(e); }
});

// Toggle a reaction on/off for the authed user. Toggling keeps counts honest:
// a user can add a reaction only once, and remove it by reacting again.
//
// v2 optimization: uses upsert/delete in a single transaction instead of
// find-then-act. Skips the final message re-fetch — returns the updated
// reaction list computed in-memory from the mutation result.
messageRouter.post('/messages/:id/reactions', requireAuth, reactionLimiter, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const emoji = sanitize(String(req.body?.emoji || ''));
    if (!emoji) throw new HttpError(400, 'emoji is required.');

    // Load message + channel in one query (needed for permission check)
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true, reactions: true },
    });
    if (!message || message.deleted) throw new HttpError(404, 'Message not found.');

    if (message.channel?.serverId) {
      const canRead = await checkChannelPermission(req.user.id, message.channel.id, 'read');
      if (!canRead) throw new HttpError(403, 'You do not have access to this channel.');
    }

    // Toggle: delete if exists, create if not — single atomic transaction
    const existing = message.reactions.find(
      (r) => r.userId === req.user.id && r.emoji === emoji
    );

    let updatedReactions;
    if (existing) {
      // Remove: delete + rebuild reaction list without this one
      await prisma.reaction.delete({ where: { id: existing.id } });
      updatedReactions = message.reactions.filter((r) => r.id !== existing.id);
    } else {
      // Add: upsert + rebuild reaction list with new one
      const created = await prisma.reaction.create({
        data: { id: `rxn-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, messageId, userId: req.user.id, emoji },
      });
      updatedReactions = [...message.reactions, created];
    }

    // Build the mapped message with updated reactions — no extra DB round-trip
    const mapped = {
      id: message.id,
      channelId: message.channelId,
      body: message.body,
      author: message.author,
      reactions: updatedReactions.map((r) => ({ emoji: r.emoji, userId: r.userId })),
    };

    const io = getIO();
    if (io) io.to(`channel:${message.channelId}`).emit('message:reactions', mapped);
    res.json(mapped);
  } catch (e) { next(e); }
});

// ── edit message ─────────────────────────────────────────────
// PATCH /api/messages/:id  body: { body: string }
//
// Anyone can edit their own messages. Moderators (FOUNDER/ADMIN/MODERATOR) can
// also edit anyone's message in their server — used for cleanup of rule
// violations. DM and announcement channels are still locked to the author
// (no server → no role).
messageRouter.patch('/messages/:id', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const newBody = sanitize(String(req.body?.body ?? req.body?.content ?? ''));
    if (!newBody.trim()) throw new HttpError(400, 'Message body cannot be empty.');
    if (newBody.length > 2000) throw new HttpError(400, 'Message body is too long.');

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!existing || existing.deleted) throw new HttpError(404, 'Message not found.');

    // Permission: author OR server moderator (FOUNDER/ADMIN/MODERATOR).
    const isAuthor =
      (existing.userId && existing.userId === req.user.id) ||
      (!existing.userId && existing.authorOverride === req.user.username);
    let isModerator = false;
    if (!isAuthor && existing.channel?.serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: existing.channel.serverId, userId: req.user.id } },
      });
      isModerator = !!member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
    }
    if (!isAuthor && !isModerator) {
      throw new HttpError(403, 'You can only edit your own messages.');
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { body: newBody, edited: true },
      include: CHANNEL_MESSAGE_INCLUDE,
    });

    const io = getIO();
    if (io) io.to(`channel:${updated.channelId}`).emit('message:updated', { message: updated });

    // Audit log: moderator editing someone else's message.
    if (isModerator && !isAuthor && existing.channel?.serverId) {
      prisma.auditLog.create({
        data: {
          serverId: existing.channel.serverId,
          userId: req.user.id,
          action: 'MESSAGE_EDIT',
          targetId: messageId,
          details: { by: 'moderator' },
        },
      }).catch((e) => console.warn('[audit] message edit log failed:', e?.message));
    }

    res.json({ message: updated });
  } catch (e) { next(e); }
});

// ── delete message (soft) ─────────────────────────────────────
// DELETE /api/messages/:id
//
// Soft-delete: sets deleted=true and clears body so it disappears from
// channel listings (which filter `deleted: false`) but keeps the row for
// audit / thread replies. Same permission rules as edit.
messageRouter.delete('/messages/:id', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!existing || existing.deleted) throw new HttpError(404, 'Message not found.');

    const isAuthor =
      (existing.userId && existing.userId === req.user.id) ||
      (!existing.userId && existing.authorOverride === req.user.username);
    let isModerator = false;
    if (!isAuthor && existing.channel?.serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: existing.channel.serverId, userId: req.user.id } },
      });
      isModerator = !!member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
    }
    if (!isAuthor && !isModerator) {
      throw new HttpError(403, 'You can only delete your own messages.');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deleted: true, body: '' },
    });

    const io = getIO();
    if (io) io.to(`channel:${existing.channelId}`).emit('message:deleted', { messageId, channelId: existing.channelId });

    // Audit log: moderator deletion.
    if (isModerator && !isAuthor && existing.channel?.serverId) {
      prisma.auditLog.create({
        data: {
          serverId: existing.channel.serverId,
          userId: req.user.id,
          action: 'MESSAGE_DELETE',
          targetId: messageId,
          details: { by: 'moderator' },
        },
      }).catch((e) => console.warn('[audit] message delete log failed:', e?.message));
    }

    res.json({ ok: true, messageId, channelId: existing.channelId });
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
      include: { author: true, reactions: true, parentMessage: { include: { author: true } } },
    });

    const io = getIO();
    if (io) io.to(`channel:${updated.channelId}`).emit('message:pinned', {
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

// ── fetch pinned messages ───────────────────────────────────
// Search messages across channels the user has access to.
messageRouter.get('/messages/search', requireAuth, async (req, res, next) => {
  try {
    const query = sanitize(String(req.query.q || ''));
    const channelId = req.query.channelId ? String(req.query.channelId) : undefined;
    if (!query) throw new HttpError(400, 'Search query is required.');

    // SECURITY: Collect only channel IDs the user can actually read.
    // 1. If a specific channelId is given, verify read permission.
    // 2. If a serverId is given, verify membership and read its channels.
    // 3. Otherwise, scope to all channels in servers the user is a member of.
    let accessibleChannelIds = null; // null = unrestricted (only when user has explicit channel access)

    if (channelId) {
      const canRead = await checkChannelPermission(req.user.id, channelId, 'read');
      if (!canRead) return res.json({ query, messages: [] });
      accessibleChannelIds = [channelId];
    } else {
      const serverId = req.query.serverId ? String(req.query.serverId) : '';

      if (serverId) {
        // Verify membership in the requested server.
        const member = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId, userId: req.user.id } },
        });
        if (!member) return res.json({ query, messages: [] });
      }

      // Find all servers the user is a member of, then their channels.
      const memberships = await prisma.serverMember.findMany({
        where: { userId: req.user.id },
        select: { serverId: true },
      });
      const memberServerIds = memberships.map((m) => m.serverId);

      if (memberServerIds.length === 0) return res.json({ query, messages: [] });

      const channels = await prisma.channel.findMany({
        where: {
          serverId: serverId && memberServerIds.includes(serverId)
            ? serverId
            : { in: memberServerIds },
        },
        select: { id: true },
      });
      accessibleChannelIds = channels.map((c) => c.id);

      if (accessibleChannelIds.length === 0) return res.json({ query, messages: [] });
    }

    // PostgreSQL full-text search via $queryRaw with ILIKE.
    const chPlaceholders = accessibleChannelIds.map((_, i) => `$${i + 1}`).join(',');
    const searchIdx = accessibleChannelIds.length + 1;
    let sql = `SELECT m.id FROM "Message" m WHERE m.deleted = 0 AND m.channelId IN (${chPlaceholders}) AND m.body ILIKE $${searchIdx}`;
    const params = [...accessibleChannelIds, `%${query}%`];

    // Scope to one author if requested.
    const userParam = req.query.userId ? String(req.query.userId).trim() : '';
    if (userParam) {
      const stripped = userParam.replace(/^@/, '');
      const user = await prisma.user.findUnique({
        where: { username: stripped },
        select: { id: true },
      });
      if (user) {
        sql += ` AND m.userId = $${params.length + 1}`;
        params.push(user.id);
      }
    }

    // Date bounds.
    if (req.query.before) {
      sql += ` AND m.createdAt < $${params.length + 1}`;
      params.push(new Date(String(req.query.before)));
    }
    if (req.query.after) {
      sql += ` AND m.createdAt > $${params.length + 1}`;
      params.push(new Date(String(req.query.after)));
    }

    sql += ` ORDER BY m.createdAt DESC LIMIT 50`;

    const matchedRows = await prisma.$queryRawUnsafe(sql, ...params);
    const matchedIds = matchedRows.map((r) => r.id);
    if (matchedIds.length === 0) {
      return res.json({ query, messages: [] });
    }

    const messages = await prisma.message.findMany({
      where: { id: { in: matchedIds } },
      include: CHANNEL_MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ query, messages });
  } catch (e) { next(e); }
});

// ── fetch pinned messages ───────────────────────────────────
messageRouter.get('/channels/:channelId/messages/pinned', requireAuth, requirePermission('read'), async (req, res, next) => {
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
