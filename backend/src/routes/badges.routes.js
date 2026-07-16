// Profile badges.
//   GET  /api/badges?serverId=        → list badges (global + optional server)
//   GET  /api/users/:id/badges        → a user's earned badges
//   POST /api/servers/:id/badges      → create a server badge (admin/owner)
//   POST /api/servers/:id/badges/:badgeId/assign  → award to a member (admin/owner)
//   DELETE /api/badges/:id            → delete a badge
//   DELETE /api/users/:id/badges/:badgeId → remove a badge from a user
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireServerAdmin } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';

export const badgesRouter = Router();

function mapBadge(b) {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    type: b.type,
    color: b.color,
    serverId: b.serverId,
  };
}

// GET /api/badges
badgesRouter.get('/badges', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.query;
    const where = serverId ? { serverId: String(serverId) } : { serverId: null };
    const badges = await prisma.badge.findMany({ where, orderBy: { createdAt: 'asc' } });
    // Also include global badges when a serverId is given.
    let all = badges;
    if (serverId) {
      const global = await prisma.badge.findMany({ where: { serverId: null }, orderBy: { createdAt: 'asc' } });
      all = [...global, ...badges];
    }
    res.json({ badges: all.map(mapBadge) });
  } catch (e) { next(e); }
});

// GET /api/users/:id/badges
badgesRouter.get('/users/:id/badges', requireAuth, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const rows = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { assignedAt: 'asc' },
    });
    res.json({ badges: rows.map((r) => ({ ...mapBadge(r.badge), assignedAt: r.assignedAt.toISOString() })) });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/badges
badgesRouter.post('/servers/:id/badges', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { name, description, icon, type, color } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, 'Badge name is required.');
    if (!icon || !String(icon).trim()) throw new HttpError(400, 'Badge icon is required.');

    const badge = await prisma.badge.create({
      data: {
        name: sanitize(String(name)).slice(0, 50),
        description: description ? sanitize(String(description)).slice(0, 200) : null,
        icon: String(icon).slice(0, 500),
        type: type || 'CUSTOM',
        color: color || '#5865f2',
        serverId: req.params.id,
      },
    });
    res.status(201).json({ badge: mapBadge(badge) });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/badges/:badgeId/assign
badgesRouter.post('/servers/:id/badges/:badgeId/assign', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { userId } = req.body || {};
    if (!userId) throw new HttpError(400, 'userId is required.');
    const badge = await prisma.badge.findUnique({ where: { id: req.params.badgeId } });
    if (!badge || badge.serverId !== req.params.id) throw new HttpError(404, 'Badge not found.');

    const assignment = await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: req.params.badgeId } },
      create: { userId, badgeId: req.params.badgeId },
      update: {},
    });
    res.status(201).json({ assigned: true, id: assignment.id });
  } catch (e) { next(e); }
});

// DELETE /api/badges/:id
badgesRouter.delete('/badges/:id', requireAuth, async (req, res, next) => {
  try {
    const badge = await prisma.badge.findUnique({ where: { id: req.params.id } });
    if (!badge) throw new HttpError(404, 'Badge not found.');
    if (badge.serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: badge.serverId, userId: req.user.id } },
      });
      if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
        throw new HttpError(403, 'Only server admins can delete this badge.');
      }
    } else if (req.user.role !== 'ADMIN') {
      throw new HttpError(403, 'Only admins can delete global badges.');
    }
    await prisma.badge.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// DELETE /api/users/:id/badges/:badgeId
badgesRouter.delete('/users/:id/badges/:badgeId', requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    // A user can remove their own badge; an admin/owner can remove anyone's.
    if (targetId !== req.user.id) {
      const badge = await prisma.badge.findUnique({ where: { id: req.params.badgeId } });
      if (badge?.serverId) {
        const member = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId: badge.serverId, userId: req.user.id } },
        });
        if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
          throw new HttpError(403, 'Not authorized.');
        }
      } else if (req.user.role !== 'ADMIN') {
        throw new HttpError(403, 'Not authorized.');
      }
    }
    await prisma.userBadge.deleteMany({ where: { userId: targetId, badgeId: req.params.badgeId } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});
