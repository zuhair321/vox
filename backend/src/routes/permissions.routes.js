import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const permissionsRouter = Router();

async function requireAdmin(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Not authorized');
  }
}

// GET /api/channels/:channelId/permissions

// Rate limiting
permissionsRouter.use(rateLimit);

permissionsRouter.get('/channels/:channelId/permissions', requireAuth, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });
    if (!channel) throw new HttpError(404, 'Channel not found');

    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId: req.user.id } },
    });
    if (!member) throw new HttpError(403, 'Not a member of this server');

    const permissions = await prisma.permission.findMany({
      where: { channelId },
      orderBy: { role: 'asc' },
    });

    res.json({ permissions });
  } catch (e) { next(e); }
});

// POST /api/channels/:channelId/permissions
permissionsRouter.post('/channels/:channelId/permissions', requireAuth, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { role, canRead, canWrite, canManage, canAdmin } = req.body || {};

    if (!role) throw new HttpError(400, 'role is required');

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });
    if (!channel) throw new HttpError(404, 'Channel not found');

    await requireAdmin(channel.serverId, req.user.id);

    const permission = await prisma.permission.upsert({
      where: { channelId_role: { channelId, role } },
      update: {
        ...(typeof canRead === 'boolean' && { canRead }),
        ...(typeof canWrite === 'boolean' && { canWrite }),
        ...(typeof canManage === 'boolean' && { canManage }),
        ...(typeof canAdmin === 'boolean' && { canAdmin }),
      },
      create: {
        channelId,
        role,
        canRead: typeof canRead === 'boolean' ? canRead : true,
        canWrite: typeof canWrite === 'boolean' ? canWrite : true,
        canManage: typeof canManage === 'boolean' ? canManage : false,
        canAdmin: typeof canAdmin === 'boolean' ? canAdmin : false,
      },
    });

    res.status(201).json({ permission });
  } catch (e) { next(e); }
});

// DELETE /api/channels/:channelId/permissions/:id
permissionsRouter.delete('/channels/:channelId/permissions/:id', requireAuth, async (req, res, next) => {
  try {
    const { channelId, id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id },
      include: { channel: { include: { server: true } } },
    });
    if (!permission || permission.channelId !== channelId) throw new HttpError(404, 'Permission not found');

    await requireAdmin(permission.channel.serverId, req.user.id);

    await prisma.permission.delete({ where: { id } });

    res.json({ deleted: true });
  } catch (e) { next(e); }
});
