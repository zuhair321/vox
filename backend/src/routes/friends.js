import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { sanitize } from '../middleware/sanitize.js';

export const friendRouter = Router();

// Rate limit friend operations to prevent spam/abuse.
const friendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many friend requests. Please wait a moment.' },
});

// Get friends, pending requests, and blocked users
friendRouter.get('/friends', requireAuth, async (req, res, next) => {
  try {
    const relationships = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          { friendId: req.user.id }
        ]
      },
      include: {
        user: {
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
        friend: {
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
      }
    });
    res.json(relationships);
  } catch (e) { next(e); }
});

// Send a friend request
friendRouter.post('/friends/request', requireAuth, friendLimiter, async (req, res, next) => {
  try {
    const username = sanitize(String(req.body?.username || ''));
    if (!username) throw new HttpError(400, 'Username is required');
    if (username === req.user.username) throw new HttpError(400, 'YOU CANNOT ADD YOURSELF');

    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser) throw new HttpError(404, 'OPERATIVE NOT FOUND IN THE NETWORK');

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.user.id, friendId: targetUser.id },
          { userId: targetUser.id, friendId: req.user.id }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') throw new HttpError(400, 'ALREADY CONNECTED WITH THIS OPERATIVE');
      throw new HttpError(400, 'REQUEST ALREADY TRANSMITTED');
    }

    const request = await prisma.friend.create({
      data: {
        userId: req.user.id,
        friendId: targetUser.id,
        status: 'pending'
      },
      include: { friend: true, user: true }
    });

    res.status(201).json(request);
  } catch (e) { next(e); }
});

// Accept a friend request
friendRouter.put('/friends/:id/accept', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const request = await prisma.friend.findUnique({ where: { id } });
    
    if (!request) throw new HttpError(404, 'Request not found');
    if (request.friendId !== req.user.id) throw new HttpError(403, 'Not authorized');

    const updated = await prisma.friend.update({
      where: { id },
      data: { status: 'accepted' },
      include: { friend: true, user: true }
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// Delete/Decline/Cancel a friend or request
friendRouter.delete('/friends/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const request = await prisma.friend.findUnique({ where: { id } });
    
    if (!request) throw new HttpError(404, 'Not found');
    if (request.userId !== req.user.id && request.friendId !== req.user.id) {
      throw new HttpError(403, 'Not authorized');
    }

    await prisma.friend.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// Block a user
friendRouter.post('/friends/block', requireAuth, friendLimiter, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new HttpError(400, 'User ID is required');
    if (userId === req.user.id) throw new HttpError(400, 'You cannot block yourself.');

    // Validate the target exists so a bad id surfaces as a clean 404 instead
    // of a 500 from the foreign-key violation on Friend.friendId.
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new HttpError(404, 'User not found.');

    // First delete any existing relationship
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId: req.user.id, friendId: userId },
          { userId, friendId: req.user.id }
        ]
      }
    });

    const blocked = await prisma.friend.create({
      data: {
        userId: req.user.id,
        friendId: userId,
        status: 'blocked'
      },
      include: { friend: true, user: true }
    });

    res.json(blocked);
  } catch (e) { next(e); }
});

// Unblock a user
friendRouter.delete('/friends/block/:userId', requireAuth, async (req, res, next) => {
  try {
    const friendId = req.params.userId;
    await prisma.friend.deleteMany({
      where: {
        userId: req.user.id,
        friendId,
        status: 'blocked'
      }
    });
    res.json({ message: 'Unblocked' });
  } catch (e) { next(e); }
});
