import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { getMemberPermissions } from '../services/moderation.service.js';
import { hasCustomPower, getExistingPowers } from '../services/custom-powers.service.js';
import { Permissions, hasPermission } from '../lib/permissions.js';

export const customPowersRouter = Router();

customPowersRouter.post('/servers/:serverId/custom-powers', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (server?.ownerId !== req.user.id) {
      throw new HttpError(403, 'Only the server owner can create custom powers.');
    }

    const { name, description, grants, grantableBy, maxHolders, icon } = req.body;
    if (icon && typeof icon === 'string' && !/^https?:\/\//i.test(icon.trim())) {
      throw new HttpError(400, 'Power icon must be an http(s) URL.');
    }
    const power = await prisma.customPower.create({
      data: {
        serverId,
        name,
        description,
        grants,
        grantableBy: grantableBy || [],
        maxHolders,
        icon,
      },
    });

    await prisma.auditLog.create({
      data: {
        serverId,
        userId: req.user.id,
        action: 'CUSTOM_POWER_CREATE',
        details: { powerId: power.id, name },
      },
    }).catch(() => {});

    res.status(201).json(power);
  } catch (e) { next(e); }
});

customPowersRouter.post('/servers/:serverId/members/:userId/custom-powers', requireAuth, async (req, res, next) => {
  try {
    const { serverId, userId } = req.params;
    const { powerId, duration } = req.body;

    const power = await prisma.customPower.findUnique({ where: { id: powerId } });
    if (!power || power.serverId !== serverId) throw new HttpError(404, 'Power not found');

    const perms = await getMemberPermissions(serverId, req.user.id);
    const hasManage = hasPermission(perms, 'MANAGE_CUSTOM_POWERS');
    const hasAdmin = hasPermission(perms, 'ADMINISTRATOR');
    if (!hasManage && !hasAdmin) {
      throw new HttpError(403, 'You need the Manage Custom Powers permission.');
    }

    if (power.maxHolders) {
      const currentHolders = await prisma.serverMember.count({
        where: {
          serverId,
          customPowers: { not: Prisma.JsonNull },
        },
      });
      if (currentHolders >= power.maxHolders) {
        throw new HttpError(400, `Maximum ${power.maxHolders} holders reached.`);
      }
    }

    const existing = await getExistingPowers(serverId, userId);
    existing[powerId] = {
      grantedAt: new Date().toISOString(),
      grantedBy: req.user.id,
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 1000).toISOString() : null,
    };

    await prisma.serverMember.update({
      where: { serverId_userId: { serverId, userId } },
      data: { customPowers: existing },
    });

    await prisma.auditLog.create({
      data: {
        serverId,
        userId: req.user.id,
        action: 'CUSTOM_POWER_GRANT',
        targetId: userId,
        details: { powerId, powerName: power.name },
      },
    }).catch(() => {});

    res.json({ granted: true });
  } catch (e) { next(e); }
});

customPowersRouter.delete('/servers/:serverId/members/:userId/custom-powers/:powerId', requireAuth, async (req, res, next) => {
  try {
    const { serverId, userId, powerId } = req.params;

    const power = await prisma.customPower.findUnique({ where: { id: powerId } });
    if (!power || power.serverId !== serverId) throw new HttpError(404, 'Power not found');

    const perms = await getMemberPermissions(serverId, req.user.id);
    const hasManage = hasPermission(perms, 'MANAGE_CUSTOM_POWERS');
    const hasAdmin = hasPermission(perms, 'ADMINISTRATOR');
    if (!hasManage && !hasAdmin) {
      throw new HttpError(403, 'You need the Manage Custom Powers permission.');
    }

    const existing = await getExistingPowers(serverId, userId);
    delete existing[powerId];

    await prisma.serverMember.update({
      where: { serverId_userId: { serverId, userId } },
      data: { customPowers: existing },
    });

    await prisma.auditLog.create({
      data: {
        serverId,
        userId: req.user.id,
        action: 'CUSTOM_POWER_REVOKE',
        targetId: userId,
        details: { powerId, powerName: power.name },
      },
    }).catch(() => {});

    res.json({ revoked: true });
  } catch (e) { next(e); }
});

customPowersRouter.get('/servers/:serverId/custom-powers', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const powers = await prisma.customPower.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ powers });
  } catch (e) { next(e); }
});
