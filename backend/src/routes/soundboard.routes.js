// Soundboard (server sounds + global sounds).
//   GET  /api/sounds?serverId=   → list sounds (global + optional server)
//   POST /api/servers/:id/sounds → create a sound (admin/owner)
//   DELETE /api/sounds/:id       → delete a sound
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireServerAdmin } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';

export const soundboardRouter = Router();

// GET /api/sounds
soundboardRouter.get('/sounds', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.query;
    let sounds = serverId
      ? await prisma.sound.findMany({ where: { serverId: String(serverId) }, orderBy: { createdAt: 'asc' } })
      : [];
    if (serverId) {
      const global = await prisma.sound.findMany({ where: { serverId: null }, orderBy: { createdAt: 'asc' } });
      sounds = [...global, ...sounds];
    } else {
      sounds = await prisma.sound.findMany({ where: { serverId: null }, orderBy: { createdAt: 'asc' } });
    }
    res.json({ sounds: sounds.map((s) => ({ id: s.id, name: s.name, url: s.url, volume: s.volume, serverId: s.serverId })) });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/sounds
soundboardRouter.post('/servers/:id/sounds', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { name, url, volume } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, 'Sound name is required.');
    if (!url || !String(url).trim()) throw new HttpError(400, 'Sound URL is required.');

    const sound = await prisma.sound.create({
      data: {
        name: sanitize(String(name)).slice(0, 50),
        url: String(url),
        volume: typeof volume === 'number' ? Math.max(0, Math.min(1, volume)) : 1.0,
        serverId: req.params.id,
      },
    });
    res.status(201).json({ sound: { id: sound.id, name: sound.name, url: sound.url, volume: sound.volume, serverId: sound.serverId } });
  } catch (e) { next(e); }
});

// DELETE /api/sounds/:id
soundboardRouter.delete('/sounds/:id', requireAuth, async (req, res, next) => {
  try {
    const sound = await prisma.sound.findUnique({ where: { id: req.params.id } });
    if (!sound) throw new HttpError(404, 'Sound not found.');
    if (sound.serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: sound.serverId, userId: req.user.id } },
      });
      if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) throw new HttpError(403, 'Only server admins can delete this sound.');
    } else if (req.user.role !== 'ADMIN') {
      throw new HttpError(403, 'Only admins can delete global sounds.');
    }
    await prisma.sound.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});
