// ═══════════════════════════════════════════════════════════════
// VOX — Sticker Routes
// ═══════════════════════════════════════════════════════════════
import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const stickerRouter = Router();
stickerRouter.use(rateLimit);

// ── Get Global Stickers ────────────────────────────────────
stickerRouter.get('/stickers/global', requireAuth, async (req, res, next) => {
  try {
    const stickers = await prisma.sticker.findMany({
      where: { serverId: null, available: true },
      orderBy: { usageCount: 'desc' },
      take: 100,
    });
    res.json({ stickers });
  } catch (e) { next(e); }
});

// ── Get Server Stickers ────────────────────────────────────
stickerRouter.get('/servers/:serverId/stickers', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const stickers = await prisma.sticker.findMany({
      where: { serverId, available: true },
      orderBy: { usageCount: 'desc' },
    });
    res.json({ stickers });
  } catch (e) { next(e); }
});

// ── Create Sticker ─────────────────────────────────────────
stickerRouter.post('/servers/:serverId/stickers', requireAuth, requirePermission('manage_emoji'), async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { name, tags, assetUrl, type } = req.body;
    const userId = req.user.id;
    
    if (!name || !assetUrl) {
      throw new HttpError(400, 'Name and assetUrl are required');
    }
    
    // Check server exists
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) {
      throw new HttpError(404, 'Server not found');
    }
    
    // Check sticker limit (50 per server)
    const count = await prisma.sticker.count({ where: { serverId } });
    if (count >= 50) {
      throw new HttpError(400, 'Server sticker limit reached (50)');
    }
    
    const sticker = await prisma.sticker.create({
      data: {
        name,
        tags: tags || name,
        assetUrl,
        type: type || 'png',
        serverId,
        creatorId: userId,
      },
    });
    
    res.status(201).json({ sticker });
  } catch (e) { next(e); }
});

// ── Delete Sticker ─────────────────────────────────────────
stickerRouter.delete('/stickers/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const sticker = await prisma.sticker.findUnique({ where: { id } });
    if (!sticker) {
      throw new HttpError(404, 'Sticker not found');
    }
    
    // Only creator or server admin can delete
    if (sticker.creatorId !== userId) {
      if (sticker.serverId) {
        const member = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId: sticker.serverId, userId } },
        });
        if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
          throw new HttpError(403, 'Not authorized');
        }
      } else {
        throw new HttpError(403, 'Not authorized');
      }
    }
    
    await prisma.sticker.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// ── Search Stickers ────────────────────────────────────────
stickerRouter.get('/stickers/search', requireAuth, async (req, res, next) => {
  try {
    const { q, serverId } = req.query;
    
    const where = { available: true };
    if (q) where.tags = { contains: q, mode: 'insensitive' };
    if (serverId) where.serverId = serverId;
    else where.serverId = null; // Global stickers
    
    const stickers = await prisma.sticker.findMany({
      where,
      orderBy: { usageCount: 'desc' },
      take: 50,
    });
    
    res.json({ stickers });
  } catch (e) { next(e); }
});

export default stickerRouter;
