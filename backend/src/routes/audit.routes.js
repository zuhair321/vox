import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const auditRouter = Router();

async function requireAdmin(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Not authorized');
  }
}

// GET /api/servers/:id/audit
auditRouter.get('/servers/:id/audit', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    await requireAdmin(serverId, req.user.id);

    const action = req.query.action ? String(req.query.action) : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const where = { serverId };
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) { next(e); }
});
