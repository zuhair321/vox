import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const bansRouter = Router();

async function requireAdmin(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Not authorized');
  }
}

// GET /api/servers/:id/bans

// Rate limiting
bansRouter.use(rateLimit);

bansRouter.get('/servers/:id/bans', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    await requireAdmin(serverId, req.user.id);

    const bans = await prisma.serverBan.findMany({
      where: { serverId },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bans });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/bans
bansRouter.post('/servers/:id/bans', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { userId, reason, expiresAt } = req.body || {};

    if (!userId) throw new HttpError(400, 'userId is required');

    await requireAdmin(serverId, req.user.id);

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (server?.ownerId === userId) throw new HttpError(400, 'Cannot ban the server owner');

    await prisma.serverMember.deleteMany({
      where: { serverId, userId },
    });

    const ban = await prisma.serverBan.upsert({
      where: { serverId_userId: { serverId, userId } },
      update: {
        reason: reason || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      create: {
        serverId,
        userId,
        reason: reason || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.status(201).json({ ban });
  } catch (e) { next(e); }
});

// DELETE /api/servers/:id/bans/:userId
bansRouter.delete('/servers/:id/bans/:userId', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const userId = req.params.userId;

    await requireAdmin(serverId, req.user.id);

    await prisma.serverBan.delete({
      where: { serverId_userId: { serverId, userId } },
    });

    res.json({ unbanned: true });
  } catch (e) { next(e); }
});
