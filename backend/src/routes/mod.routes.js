// Moderation routes: timeout/mute users in a server.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const modRouter = Router();

// POST /api/servers/:id/timeout/:userId
// Set a timeout (mute) on a member. Moderator+ only.

// Rate limiting
modRouter.use(rateLimit);

modRouter.post('/servers/:id/timeout/:userId', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId, userId: targetId } = req.params;
    const { minutes } = req.body; // 0 = remove timeout, otherwise minutes

    const me = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!me || !['FOUNDER', 'ADMIN', 'MODERATOR'].includes(me.role)) {
      throw new HttpError(403, 'Only moderators can set timeouts.');
    }

    const target = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: targetId } },
    });
    if (!target) throw new HttpError(404, 'Member not found.');

    // Prevent moderators from timing out admins/founders
    if (target.role === 'FOUNDER' && me.role !== 'FOUNDER') {
      throw new HttpError(403, 'Cannot timeout the server owner.');
    }
    if (target.role === 'ADMIN' && me.role !== 'FOUNDER' && me.role !== 'ADMIN') {
      throw new HttpError(403, 'Cannot timeout an admin.');
    }

    const mutedUntil = minutes > 0
      ? new Date(Date.now() + minutes * 60 * 1000)
      : null;

    const updated = await prisma.serverMember.update({
      where: { serverId_userId: { serverId, userId: targetId } },
      data: { mutedUntil },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        serverId,
        userId: req.user.id,
        action: minutes > 0 ? 'MEMBER_TIMEOUT' : 'MEMBER_UNTIMEOUT',
        targetId,
        details: { minutes, mutedUntil: mutedUntil?.toISOString() || null },
      },
    }).catch(() => {});

    res.json({ mutedUntil: updated.mutedUntil, member: updated });
  } catch (e) { next(e); }
});

// GET /api/servers/:id/members/:userId
// Get member details (includes mutedUntil)
modRouter.get('/servers/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId, userId } = req.params;
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } },
    });
    if (!member) throw new HttpError(404, 'Member not found.');
    res.json(member);
  } catch (e) { next(e); }
});
