// Auto-moderation: word filter, spam detection, strike system.
//   GET    /api/servers/:id/automod                 → get automod config
//   POST   /api/servers/:id/automod/settings        → update automod config (admin+)
//   GET    /api/servers/:id/strikes/:userId         → list a user's strikes (mod+)
//   POST   /api/servers/:id/strikes/:userId         → issue a strike (mod+)
//   DELETE /api/servers/:id/strikes/:strikeId       → remove a strike (admin+)
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { invalidateAutomodCache } from '../services/automod.service.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const automodRouter = Router();

const STRIKE_TTL_DAYS = 30; // how long a strike stays "active" for the count

async function requireMember(serverId, userId, roles) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !roles.includes(member.role)) {
    throw new HttpError(403, 'You do not have permission for this action.');
  }
  return member;
}

// GET /api/servers/:id/automod

// Rate limiting
automodRouter.use(rateLimit);

automodRouter.get('/servers/:id/automod', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId } = req.params;
    const config = await prisma.automodConfig.findUnique({ where: { serverId } });
    res.json({ automod: config });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/automod/settings
automodRouter.post('/servers/:id/automod/settings', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId } = req.params;
    await requireMember(serverId, req.user.id, ['FOUNDER', 'ADMIN']);

    const { filterWords, filterLinks, filterSpam, maxStrikes, strikeTimeout } = req.body || {};
    const clean = {
      ...(filterWords !== undefined ? { filterWords: !!filterWords } : {}),
      ...(filterLinks !== undefined ? { filterLinks: !!filterLinks } : {}),
      ...(filterSpam !== undefined ? { filterSpam: !!filterSpam } : {}),
      ...(maxStrikes !== undefined ? { maxStrikes: Math.max(1, Math.min(20, Number(maxStrikes) || 3)) } : {}),
      ...(strikeTimeout !== undefined ? { strikeTimeout: Math.max(1, Math.min(43200, Number(strikeTimeout) || 1440)) } : {}),
    };

    const config = await prisma.automodConfig.upsert({
      where: { serverId },
      create: { serverId, ...clean },
      update: clean,
    });

    invalidateAutomodCache(serverId);
    res.json({ automod: config });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/strikes/:userId
automodRouter.post('/servers/:id/strikes/:userId', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId, userId } = req.params;
    const { reason, auto } = req.body || {};
    await requireMember(serverId, req.user.id, ['FOUNDER', 'ADMIN', 'MODERATOR']);

    const config = await prisma.automodConfig.findUnique({ where: { serverId } });
    const maxStrikes = config?.maxStrikes ?? 3;
    const strikeTimeout = config?.strikeTimeout ?? 1440;

    const strike = await prisma.strike.create({
      data: {
        serverId,
        userId,
        issuedBy: req.user.id,
        reason: String(reason || 'No reason provided').slice(0, 500),
        auto: !!auto,
        expiresAt: new Date(Date.now() + STRIKE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const strikeCount = await prisma.strike.count({
      where: { serverId, userId, active: true, expiresAt: { gt: new Date() } },
    });

    let timedOut = false;
    if (strikeCount >= maxStrikes) {
      await prisma.serverMember.update({
        where: { serverId_userId: { serverId, userId } },
        data: { mutedUntil: new Date(Date.now() + strikeTimeout * 60 * 1000) },
      }).catch(() => {});
      timedOut = true;
    }

    await prisma.auditLog.create({
      data: {
        serverId,
        userId: req.user.id,
        action: 'STRIKE_ISSUED',
        targetId: userId,
        details: { reason, strikeId: strike.id, auto: !!auto },
      },
    }).catch(() => {});

    res.status(201).json({ strike, strikeCount, timedOut });
  } catch (e) { next(e); }
});

// GET /api/servers/:id/strikes/:userId
automodRouter.get('/servers/:id/strikes/:userId', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId, userId } = req.params;
    await requireMember(serverId, req.user.id, ['FOUNDER', 'ADMIN', 'MODERATOR']);
    const strikes = await prisma.strike.findMany({
      where: { serverId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const activeCount = strikes.filter((s) => s.active && (!s.expiresAt || s.expiresAt > new Date())).length;
    res.json({ strikes, activeCount });
  } catch (e) { next(e); }
});

// DELETE /api/servers/:id/strikes/:strikeId
automodRouter.delete('/servers/:id/strikes/:strikeId', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId, strikeId } = req.params;
    await requireMember(serverId, req.user.id, ['FOUNDER', 'ADMIN']);
    await prisma.strike.update({ where: { id: strikeId }, data: { active: false } });
    res.json({ removed: true });
  } catch (e) { next(e); }
});
