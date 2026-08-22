// Forum channels.
//   GET    /api/channels/:id/forum-posts        → list forum posts
//   POST   /api/channels/:id/forum-posts        → create a forum post
//   GET    /api/forum-posts/:id                 → post + its replies
//   POST   /api/forum-posts/:id/replies         → reply to a post
//   PATCH  /api/forum-posts/:id                 → edit post (author/mod)
//   DELETE /api/forum-posts/:id                 → delete post (author/mod)
//
// Forum posts are Messages flagged with isForumPost=true; replies are normal
// messages whose parentId points at the post.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { getIO } from '../sockets/index.js';
import { emitRealtimeEvent } from '../lib/redis_bridge.js';
import { sanitize } from '../middleware/sanitize.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const forumsRouter = Router();

const POST_INCLUDE = {
  author: true,
  reactions: true,
  _count: { select: { threadMessages: true } },
};

// GET /api/channels/:id/forum-posts

// Rate limiting
forumsRouter.use(rateLimit);

forumsRouter.get('/channels/:id/forum-posts', requireAuth, requirePermission('read'), async (req, res, next) => {
  try {
    const posts = await prisma.message.findMany({
      where: { channelId: req.params.id, isForumPost: true, deleted: false },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ posts });
  } catch (e) { next(e); }
});

// POST /api/channels/:id/forum-posts
forumsRouter.post('/channels/:id/forum-posts', requireAuth, requirePermission('write'), async (req, res, next) => {
  try {
    const { content, tags } = req.body || {};
    const body = sanitize(String(content || '')).slice(0, 2000);
    if (!body.trim()) throw new HttpError(400, 'Post content is required.');

    const normalizedTags = Array.isArray(tags)
      ? tags.map((t) => String(t).slice(0, 32)).filter(Boolean).slice(0, 10)
      : [];

    const post = await prisma.message.create({
      data: {
        channelId: req.params.id,
        userId: req.user.id,
        body,
        isForumPost: true,
        tags: normalizedTags.length ? normalizedTags : undefined,
      },
      include: POST_INCLUDE,
    });

    const io = getIO();
    emitRealtimeEvent('forum:post', `channel:${req.params.id}`, { post });
    res.status(201).json({ post });
  } catch (e) { next(e); }
});

// GET /api/forum-posts/:id
forumsRouter.get('/forum-posts/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: { ...POST_INCLUDE, channel: { select: { id: true, serverId: true } } },
    });
    if (!post || !post.isForumPost) throw new HttpError(404, 'Forum post not found.');

    // Permission gate: must be a member of the post's server.
    if (post.channel?.serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: post.channel.serverId, userId: req.user.id } },
      });
      if (!member) throw new HttpError(403, 'You do not have access to this post.');
    }

    const replies = await prisma.message.findMany({
      where: { parentId: post.id, deleted: false },
      include: { author: true, reactions: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json({ post, replies });
  } catch (e) { next(e); }
});

// POST /api/forum-posts/:id/replies
forumsRouter.post('/forum-posts/:id/replies', requireAuth, async (req, res, next) => {
  try {
    const parent = await prisma.message.findUnique({ where: { id: req.params.id }, include: { channel: true } });
    if (!parent || !parent.isForumPost) throw new HttpError(404, 'Forum post not found.');

    const canWrite = await checkWrite(req.user.id, parent.channelId);
    if (!canWrite) throw new HttpError(403, 'You cannot reply here.');

    const { content } = req.body || {};
    const body = sanitize(String(content || '')).slice(0, 2000);
    if (!body.trim()) throw new HttpError(400, 'Reply content is required.');

    const reply = await prisma.message.create({
      data: { channelId: parent.channelId, userId: req.user.id, body, parentId: parent.id },
      include: { author: true, reactions: true },
    });

    const io = getIO();
    emitRealtimeEvent('forum:reply', `channel:${parent.channelId}`, { postId: parent.id, reply });
    res.status(201).json({ reply });
  } catch (e) { next(e); }
});

// PATCH /api/forum-posts/:id
forumsRouter.patch('/forum-posts/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await prisma.message.findUnique({ where: { id: req.params.id }, include: { channel: true } });
    if (!post || !post.isForumPost) throw new HttpError(404, 'Forum post not found.');
    const { content, tags } = req.body || {};
    const body = content ? sanitize(String(content)).slice(0, 2000) : post.body;
    if (!body.trim()) throw new HttpError(400, 'Post content cannot be empty.');

    const isAuthor = post.userId === req.user.id;
    let isMod = false;
    if (!isAuthor && post.channel?.serverId) {
      const member = await prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: post.channel.serverId, userId: req.user.id } } });
      isMod = !!member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
    }
    if (!isAuthor && !isMod) throw new HttpError(403, 'You can only edit your own posts.');

    const normalizedTags = Array.isArray(tags)
      ? tags.map((t) => String(t).slice(0, 32)).filter(Boolean).slice(0, 10)
      : post.tags;

    const updated = await prisma.message.update({
      where: { id: post.id },
      data: { body, edited: true, tags: normalizedTags || undefined },
      include: POST_INCLUDE,
    });
    res.json({ post: updated });
  } catch (e) { next(e); }
});

// DELETE /api/forum-posts/:id
forumsRouter.delete('/forum-posts/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await prisma.message.findUnique({ where: { id: req.params.id }, include: { channel: true } });
    if (!post || !post.isForumPost) throw new HttpError(404, 'Forum post not found.');
    const isAuthor = post.userId === req.user.id;
    let isMod = false;
    if (!isAuthor && post.channel?.serverId) {
      const member = await prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: post.channel.serverId, userId: req.user.id } } });
      isMod = !!member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
    }
    if (!isAuthor && !isMod) throw new HttpError(403, 'You can only delete your own posts.');

    await prisma.message.update({ where: { id: post.id }, data: { deleted: true, body: '' } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

async function checkWrite(userId, channelId) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId }, include: { server: { select: { ownerId: true } } } });
  if (!channel) return false;
  if (!channel.serverId) return true;
  if (channel.server?.ownerId === userId) return true;
  const member = await prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: channel.serverId, userId } } });
  return !!member && ['FOUNDER', 'ADMIN', 'MODERATOR', 'MEMBER'].includes(member.role);
}
