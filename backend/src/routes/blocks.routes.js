import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const blockRouter = Router();

// Block a user

// Rate limiting
blockRouter.use(rateLimit);

blockRouter.post('/blocks', requireAuth, async (req, res, next) => {
  try {
    const blockedId = String(req.body?.userId || '').trim();
    if (!blockedId) throw new HttpError(400, 'userId required');
    if (blockedId === req.user.id) throw new HttpError(400, 'Cannot block yourself');

    const existing = await prisma.block.findUnique({
      where: { userId_blockedId: { userId: req.user.id, blockedId } },
    });
    if (existing) throw new HttpError(409, 'Already blocked');

    const block = await prisma.block.create({
      data: {
        userId: req.user.id,
        blockedId,
        reason: req.body?.reason || null,
      },
    });

    res.status(201).json({ block });
  } catch (e) { next(e); }
});

// Unblock a user
blockRouter.delete('/blocks/:userId', requireAuth, async (req, res, next) => {
  try {
    const blockedId = req.params.userId;
    const deleted = await prisma.block.deleteMany({
      where: { userId: req.user.id, blockedId },
    });
    if (deleted.count === 0) throw new HttpError(404, 'Not blocked');
    res.json({ unblocked: true });
  } catch (e) { next(e); }
});

// Get my blocked list
blockRouter.get('/blocks', requireAuth, async (req, res, next) => {
  try {
    const blocks = await prisma.block.findMany({
      where: { userId: req.user.id },
      include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    res.json({ blocks });
  } catch (e) { next(e); }
});

// Check if a user is blocked (by me or blocking me)
blockRouter.get('/blocks/check/:userId', requireAuth, async (req, res, next) => {
  try {
    const otherId = req.params.userId;
    const [byMe, byThem] = await Promise.all([
      prisma.block.findUnique({ where: { userId_blockedId: { userId: req.user.id, blockedId: otherId } } }),
      prisma.block.findUnique({ where: { userId_blockedId: { userId: otherId, blockedId: req.user.id } } }),
    ]);
    res.json({ blocked: !!byMe, blockingMe: !!byThem });
  } catch (e) { next(e); }
});
