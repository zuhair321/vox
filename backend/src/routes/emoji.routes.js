import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const emojiRouter = Router();

async function requireAdmin(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Not authorized');
  }
}

// GET /api/servers/:id/emojis
emojiRouter.get('/servers/:id/emojis', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member) throw new HttpError(403, 'Not a member of this server');

    const emojis = await prisma.customEmoji.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ emojis });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/emojis
emojiRouter.post('/servers/:id/emojis', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { name, url } = req.body || {};

    if (!name || typeof name !== 'string') throw new HttpError(400, 'name is required');
    if (!url || typeof url !== 'string') throw new HttpError(400, 'url is required');

    await requireAdmin(serverId, req.user.id);

    const emoji = await prisma.customEmoji.create({
      data: {
        serverId,
        name: name.trim().toLowerCase(),
        url: url.trim(),
      },
    });

    res.status(201).json({ emoji });
  } catch (e) { next(e); }
});

// DELETE /api/servers/:id/emojis/:emojiId
emojiRouter.delete('/servers/:id/emojis/:emojiId', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const emojiId = req.params.emojiId;

    await requireAdmin(serverId, req.user.id);

    const emoji = await prisma.customEmoji.findUnique({
      where: { id: emojiId },
    });
    if (!emoji || emoji.serverId !== serverId) throw new HttpError(404, 'Emoji not found');

    await prisma.customEmoji.delete({ where: { id: emojiId } });

    res.json({ deleted: true });
  } catch (e) { next(e); }
});
