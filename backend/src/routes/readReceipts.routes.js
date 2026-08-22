// Read receipt routes.
//   POST /api/messages/:id/read  — mark a message as read
//   GET  /api/messages/:id/read  — get who has read a message
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import crypto from 'node:crypto';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const readReceiptRouter = Router();

// POST /api/messages/:id/read — record that current user has read a message

// Rate limiting
readReceiptRouter.use(rateLimit);

readReceiptRouter.post('/messages/:id/read', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    if (!userId || !messageId) {
      throw new HttpError(400, 'Missing userId or messageId');
    }

    // Atomic upsert — race-condition safe. If the (messageId, userId) pair already
    // exists, update readAt; otherwise insert. No find-then-act gap.
    await prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { id: crypto.randomUUID(), messageId, userId, readAt: new Date() },
      update: { readAt: new Date() },
    });

    res.json({ ok: true, messageId, userId });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/:id/read — get all users who have read a message
readReceiptRouter.get('/messages/:id/read', requireAuth, async (req, res, next) => {
  try {
    const messageId = req.params.id;

    if (!messageId) {
      throw new HttpError(400, 'Missing messageId');
    }

    const reads = await prisma.messageRead.findMany({
      where: { messageId },
      include: {
        // MessageRead doesn't have a relation to User in schema,
        // so we query reads then join manually.
      },
      orderBy: { readAt: 'asc' },
      take: 20,
    });

    // Enrich with user info by querying users separately.
    const userIds = [...new Set(reads.map((r) => r.userId))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, avatarUrl: true, status: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = reads.map((r) => ({
      readAt: r.readAt,
      userId: r.userId,
      username: userMap[r.userId]?.username ?? 'Unknown',
      avatarUrl: userMap[r.userId]?.avatarUrl ?? null,
      status: userMap[r.userId]?.status ?? 'OFFLINE',
    }));

    res.json({ reads: enriched });
  } catch (err) {
    next(err);
  }
});
