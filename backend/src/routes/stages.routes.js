// Stage channels (speaker requests / audience model).
//   GET    /api/channels/:id/stage/speakers             → list speakers/requests
//   POST   /api/channels/:id/stage/speakers/request     → request to speak
//   POST   /api/channels/:id/stage/speakers/:userId/approve → approve speaker (mod+)
//   POST   /api/channels/:id/stage/speakers/:userId/mod      → promote to stage mod (mod+)
//   DELETE /api/channels/:id/stage/speakers/:userId     → remove speaker (mod+ or self)
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { getIO } from '../sockets/index.js';
import { emitRealtimeEvent } from '../lib/redis_bridge.js';

export const stagesRouter = Router();

async function requireStageMod(userId, serverId) {
  if (!serverId) return false;
  const member = await prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId } } });
  return !!member && ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(member.role);
}

function mapSpeaker(s) {
  return {
    userId: s.userId,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    user: s.user ? { id: s.user.id, username: s.user.username, displayName: s.user.displayName, avatarUrl: s.user.avatarUrl } : undefined,
  };
}

// GET /api/channels/:id/stage/speakers
stagesRouter.get('/channels/:id/stage/speakers', requireAuth, async (req, res, next) => {
  try {
    const speakers = await prisma.stageSpeaker.findMany({
      where: { channelId: req.params.id },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ speakers: speakers.map(mapSpeaker) });
  } catch (e) { next(e); }
});

// POST /api/channels/:id/stage/speakers/request
stagesRouter.post('/channels/:id/stage/speakers/request', requireAuth, async (req, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) throw new HttpError(404, 'Channel not found.');
    if (channel.type !== 'STAGE') throw new HttpError(400, 'Not a stage channel.');

    const speaker = await prisma.stageSpeaker.upsert({
      where: { channelId_userId: { channelId: req.params.id, userId: req.user.id } },
      create: { channelId: req.params.id, userId: req.user.id, status: 'REQUESTED' },
      update: { status: 'REQUESTED' },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    const io = getIO();
    emitRealtimeEvent('stage:speakers', req.params.id, { speakers: [mapSpeaker(speaker)] });
    res.status(201).json({ speaker: mapSpeaker(speaker) });
  } catch (e) { next(e); }
});

// POST /api/channels/:id/stage/speakers/:userId/approve
stagesRouter.post('/channels/:id/stage/speakers/:userId/approve', requireAuth, async (req, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) throw new HttpError(404, 'Channel not found.');
    if (!(await requireStageMod(req.user.id, channel.serverId))) throw new HttpError(403, 'Moderator access required.');

    const speaker = await prisma.stageSpeaker.upsert({
      where: { channelId_userId: { channelId: req.params.id, userId: req.params.userId } },
      create: { channelId: req.params.id, userId: req.params.userId, status: 'SPEAKER' },
      update: { status: 'SPEAKER' },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    const io = getIO();
    emitRealtimeEvent('stage:speakers', req.params.id, { speakers: [mapSpeaker(speaker)] });
    res.json({ speaker: mapSpeaker(speaker) });
  } catch (e) { next(e); }
});

// POST /api/channels/:id/stage/speakers/:userId/mod
stagesRouter.post('/channels/:id/stage/speakers/:userId/mod', requireAuth, async (req, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) throw new HttpError(404, 'Channel not found.');
    if (!(await requireStageMod(req.user.id, channel.serverId))) throw new HttpError(403, 'Moderator access required.');

    const speaker = await prisma.stageSpeaker.upsert({
      where: { channelId_userId: { channelId: req.params.id, userId: req.params.userId } },
      create: { channelId: req.params.id, userId: req.params.userId, status: 'MOD' },
      update: { status: 'MOD' },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    const io = getIO();
    emitRealtimeEvent('stage:speakers', req.params.id, { speakers: [mapSpeaker(speaker)] });
    res.json({ speaker: mapSpeaker(speaker) });
  } catch (e) { next(e); }
});

// DELETE /api/channels/:id/stage/speakers/:userId
stagesRouter.delete('/channels/:id/stage/speakers/:userId', requireAuth, async (req, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) throw new HttpError(404, 'Channel not found.');

    const isSelf = req.params.userId === req.user.id;
    if (!isSelf && !(await requireStageMod(req.user.id, channel.serverId))) {
      throw new HttpError(403, 'Moderator access required.');
    }

    await prisma.stageSpeaker.deleteMany({ where: { channelId: req.params.id, userId: req.params.userId } });
    const io = getIO();
    emitRealtimeEvent('stage:speaker-removed', req.params.id, { userId: req.params.userId });
    res.json({ removed: true });
  } catch (e) { next(e); }
});
