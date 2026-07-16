// Stickers (server packs + global stickers).
//   GET  /api/stickers?serverId=   → list stickers (global + optional server)
//   POST /api/servers/:id/stickers → create a sticker (admin/owner)
//   DELETE /api/stickers/:id       → delete a sticker
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireServerAdmin } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';

export const stickersRouter = Router();

// GET /api/stickers
stickersRouter.get('/stickers', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.query;
    let stickers = serverId
      ? await prisma.sticker.findMany({ where: { serverId: String(serverId) }, orderBy: { createdAt: 'asc' } })
      : [];
    if (serverId) {
      const global = await prisma.sticker.findMany({ where: { serverId: null }, orderBy: { createdAt: 'asc' } });
      stickers = [...global, ...stickers];
    } else {
      stickers = await prisma.sticker.findMany({ where: { serverId: null }, orderBy: { createdAt: 'asc' } });
    }
    res.json({ stickers: stickers.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type, serverId: s.serverId })) });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/stickers
stickersRouter.post('/servers/:id/stickers', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { name, url, type } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, 'Sticker name is required.');
    if (!url || !String(url).trim()) throw new HttpError(400, 'Sticker URL is required.');

    const sticker = await prisma.sticker.create({
      data: {
        name: sanitize(String(name)).slice(0, 50),
        url: String(url),
        type: type || 'PNG',
        serverId: req.params.id,
      },
    });
    res.status(201).json({ sticker: { id: sticker.id, name: sticker.name, url: sticker.url, type: sticker.type, serverId: sticker.serverId } });
  } catch (e) { next(e); }
});

// DELETE /api/stickers/:id
stickersRouter.delete('/stickers/:id', requireAuth, async (req, res, next) => {
  try {
    const sticker = await prisma.sticker.findUnique({ where: { id: req.params.id } });
    if (!sticker) throw new HttpError(404, 'Sticker not found.');
    if (sticker.serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: sticker.serverId, userId: req.user.id } },
      });
      if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) throw new HttpError(403, 'Only server admins can delete this sticker.');
    } else if (req.user.role !== 'ADMIN') {
      throw new HttpError(403, 'Only admins can delete global stickers.');
    }
    await prisma.sticker.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});
