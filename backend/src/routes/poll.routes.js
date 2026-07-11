// Poll routes.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, checkChannelPermission } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';
import { getIO } from '../sockets/index.js';

export const pollRouter = Router();

// GET /api/channels/:channelId/polls
pollRouter.get('/channels/:channelId/polls', requireAuth, requirePermission('read'), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const polls = await prisma.poll.findMany({
      where: { channelId, ended: false },
      include: {
        options: { include: { votes: true } },
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(polls);
  } catch (e) { next(e); }
});

// POST /api/channels/:channelId/polls
pollRouter.post('/channels/:channelId/polls', requireAuth, requirePermission('write'), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { question, options, maxVotes, expiresAt } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      throw new HttpError(400, 'Question must be at least 2 characters.');
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
      throw new HttpError(400, 'Provide 2-10 options.');
    }
    const sanitizedOptions = options
      .filter((o: any) => typeof o === 'string' && o.trim().length > 0)
      .map((o: string) => sanitize(o.trim()).slice(0, 100));

    if (sanitizedOptions.length < 2) {
      throw new HttpError(400, 'At least 2 valid options required.');
    }

    const poll = await prisma.poll.create({
      data: {
        channelId,
        userId: req.user.id,
        question: sanitize(question.trim()).slice(0, 300),
        maxVotes: Math.max(1, Math.min(10, parseInt(maxVotes, 10) || 1)),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        options: {
          create: sanitizedOptions.map((text) => ({ text })),
        },
      },
      include: {
        options: { include: { votes: true } },
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    const io = getIO();
    if (io) io.to(`channel:${channelId}`).emit('poll:new', { poll });

    res.status(201).json(poll);
  } catch (e) { next(e); }
});

// POST /api/polls/:pollId/vote
pollRouter.post('/polls/:pollId/vote', requireAuth, async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const { optionIds } = req.body;

    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      throw new HttpError(400, 'optionIds must be a non-empty array.');
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll || poll.ended) throw new HttpError(404, 'Poll not found or ended.');
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      await prisma.poll.update({ where: { id: pollId }, data: { ended: true } });
      throw new HttpError(400, 'Poll has expired.');
    }

    const validOptionIds = poll.options.map((o) => o.id);
    const selected = optionIds.filter((id: string) => validOptionIds.includes(id));
    if (selected.length === 0) throw new HttpError(400, 'Invalid option(s).');
    if (selected.length > poll.maxVotes) {
      throw new HttpError(400, `You can vote for up to ${poll.maxVotes} option(s).`);
    }

    // Remove existing votes from this user
    const existingVotes = await prisma.pollVote.findMany({
      where: { option: { pollId }, userId: req.user.id },
    });
    await prisma.pollVote.deleteMany({
      where: { id: { in: existingVotes.map((v) => v.id) } },
    });

    // Add new votes
    await prisma.pollVote.createMany({
      data: selected.map((optionId: string) => ({
        optionId,
        userId: req.user.id,
      })),
    });

    // Fetch updated poll
    const updated = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: { include: { votes: true } },
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    const io = getIO();
    if (io) io.to(`channel:${poll.channelId}`).emit('poll:update', { poll: updated });

    res.json(updated);
  } catch (e) { next(e); }
});

// POST /api/polls/:pollId/end
pollRouter.post('/polls/:pollId/end', requireAuth, async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw new HttpError(404, 'Poll not found.');

    // Only creator or admins can end
    if (poll.userId !== req.user.id && poll.channelId) {
      const canManage = await checkChannelPermission(req.user.id, poll.channelId, 'manage');
      if (!canManage) throw new HttpError(403, 'Not authorized.');
    }

    const updated = await prisma.poll.update({
      where: { id: pollId },
      data: { ended: true },
      include: {
        options: { include: { votes: true } },
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    const io = getIO();
    if (io) io.to(`channel:${poll.channelId}`).emit('poll:ended', { poll: updated });

    res.json(updated);
  } catch (e) { next(e); }
});
