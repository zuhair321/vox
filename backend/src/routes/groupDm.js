import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const groupDmRouter = Router();
groupDmRouter.use(rateLimit);

// Create Group DM
groupDmRouter.post('/group-dms', requireAuth, async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;
    const userId = req.user.id;
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1 || memberIds.length > 9) {
      throw new HttpError(400, 'Group DM must have 2-10 members');
    }
    const uniqueMemberIds = [...new Set(memberIds.filter(id => id !== userId))];
    if (uniqueMemberIds.length < 1) throw new HttpError(400, 'At least one other member required');
    const members = await prisma.user.findMany({ where: { id: { in: uniqueMemberIds } }, select: { id: true } });
    if (members.length !== uniqueMemberIds.length) throw new HttpError(400, 'One or more users not found');
    const groupDm = await prisma.groupDm.create({
      data: { name: name || null, ownerId: userId, members: { create: [{ userId }, ...uniqueMemberIds.map(id => ({ userId: id }))] } },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } } } },
    });
    res.status(201).json({ groupDm });
  } catch (e) { next(e); }
});

// List Group DMs
groupDmRouter.get('/group-dms', requireAuth, async (req, res, next) => {
  try {
    const memberships = await prisma.groupDmMember.findMany({
      where: { userId: req.user.id },
      include: { groupDm: { include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } } }, messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, username: true, displayName: true } } } } } } },
      orderBy: { groupDm: { updatedAt: 'desc' } },
    });
    const groupDms = memberships.map(m => ({ ...m.groupDm, lastMessage: m.groupDm.messages[0] || null }));
    res.json({ groupDms });
  } catch (e) { next(e); }
});

// Get Group DM Details
groupDmRouter.get('/group-dms/:id', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupDmMember.findUnique({ where: { groupDmId_userId: { groupDmId: req.params.id, userId: req.user.id } } });
    if (!membership) throw new HttpError(403, 'Not a member');
    const groupDm = await prisma.groupDm.findUnique({ where: { id: req.params.id }, include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } } } } });
    if (!groupDm) throw new HttpError(404, 'Not found');
    res.json({ groupDm });
  } catch (e) { next(e); }
});

// Send Message
groupDmRouter.post('/group-dms/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;
    const membership = await prisma.groupDmMember.findUnique({ where: { groupDmId_userId: { groupDmId: id, userId: req.user.id } } });
    if (!membership) throw new HttpError(403, 'Not a member');
    if (!content && (!attachments || attachments.length === 0)) throw new HttpError(400, 'Content required');
    const message = await prisma.groupDmMessage.create({
      data: { groupDmId: id, senderId: req.user.id, content: content || null, attachments: attachments || null },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    await prisma.groupDm.update({ where: { id }, data: { updatedAt: new Date() } });
    const { getIO } = await import('../sockets/index.js');
    const io = getIO();
    const members = await prisma.groupDmMember.findMany({ where: { groupDmId: id }, select: { userId: true } });
    for (const m of members) io.to('user:' + m.userId).emit('group-dm:message', { groupDmId: id, message });
    res.status(201).json({ message });
  } catch (e) { next(e); }
});

// Get Messages
groupDmRouter.get('/group-dms/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupDmMember.findUnique({ where: { groupDmId_userId: { groupDmId: req.params.id, userId: req.user.id } } });
    if (!membership) throw new HttpError(403, 'Not a member');
    const { before, limit = 50 } = req.query;
    const where = { groupDmId: req.params.id, deleted: false };
    if (before) where.createdAt = { lt: new Date(before) };
    const messages = await prisma.groupDmMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(parseInt(limit), 100), include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } });
    res.json({ messages: messages.reverse() });
  } catch (e) { next(e); }
});

// Add Member
groupDmRouter.post('/group-dms/:id/members', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId: newMemberId } = req.body;
    const membership = await prisma.groupDmMember.findUnique({ where: { groupDmId_userId: { groupDmId: id, userId: req.user.id } } });
    if (!membership) throw new HttpError(403, 'Not a member');
    const count = await prisma.groupDmMember.count({ where: { groupDmId: id } });
    if (count >= 10) throw new HttpError(400, 'Max 10 members');
    const existing = await prisma.groupDmMember.findUnique({ where: { groupDmId_userId: { groupDmId: id, userId: newMemberId } } });
    if (existing) throw new HttpError(400, 'Already a member');
    const newMember = await prisma.groupDmMember.create({ data: { groupDmId: id, userId: newMemberId }, include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } } });
    res.json({ member: newMember });
  } catch (e) { next(e); }
});

// Leave Group DM
groupDmRouter.delete('/group-dms/:id/members/me', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupDmMember.findUnique({ where: { groupDmId_userId: { groupDmId: req.params.id, userId: req.user.id } } });
    if (!membership) throw new HttpError(403, 'Not a member');
    await prisma.groupDmMember.delete({ where: { groupDmId_userId: { groupDmId: req.params.id, userId: req.user.id } } });
    const remaining = await prisma.groupDmMember.count({ where: { groupDmId: req.params.id } });
    if (remaining === 0) await prisma.groupDm.delete({ where: { id: req.params.id } });
    res.json({ left: true });
  } catch (e) { next(e); }
});

export default groupDmRouter;
