// Custom role management routes (Prisma equivalents for serverrole / servermemberrole tables).
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireServerAdmin, invalidateMembershipCache } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const rolesRouter = Router();

// GET /api/:serverId/roles — list all roles for a server
rolesRouter.get('/:serverId/roles', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const roles = await prisma.serverRole.findMany({
      where: { serverId },
      orderBy: { position: 'asc' },
    });
    res.json({ roles });
  } catch (err) { next(err); }
});

// POST /api/:serverId/roles — create a new role
rolesRouter.post('/:serverId/roles', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { name, color, hoist, position, permissions } = req.body;

    if (!name || typeof name !== 'string' || name.length > 100) {
      throw new HttpError(400, 'Role name is required (max 100 chars).');
    }

    const id = `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const roleColor = (color && /^#[0-9a-fA-F]{6}$/.test(color)) ? color : '#5865f2';
    const roleHoist = hoist ? true : false;
    const rolePosition = typeof position === 'number' ? position : 0;
    const rolePermissions = typeof permissions === 'bigint' || typeof permissions === 'number'
      ? BigInt(permissions) : 0n;

    const role = await prisma.serverRole.create({
      data: {
        id,
        serverId,
        name: name.trim(),
        color: roleColor,
        hoist: roleHoist,
        position: rolePosition,
        permissions: rolePermissions,
      },
    });

    res.status(201).json({ role });
  } catch (err) { next(err); }
});

// PATCH /api/:serverId/roles/:roleId — update a role
rolesRouter.patch('/:serverId/roles/:roleId', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { serverId, roleId } = req.params;
    const { name, color, hoist, position, permissions } = req.body;

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (color !== undefined && /^#[0-9a-fA-F]{6}$/.test(color)) data.color = color;
    if (hoist !== undefined) data.hoist = !!hoist;
    if (typeof position === 'number') data.position = position;
    if (typeof permissions === 'bigint' || typeof permissions === 'number') {
      data.permissions = BigInt(permissions);
    }

    if (Object.keys(data).length === 0) {
      throw new HttpError(400, 'No valid fields to update.');
    }

    const role = await prisma.serverRole.update({
      where: { id: roleId },
      data,
    });
    res.json({ role });
  } catch (err) { next(err); }
});

// DELETE /api/:serverId/roles/:roleId — delete a role
rolesRouter.delete('/:serverId/roles/:roleId', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { roleId } = req.params;
    await prisma.serverMemberRole.deleteMany({ where: { roleId } });
    await prisma.serverRole.delete({ where: { id: roleId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/:serverId/members/:memberId/roles — assign role(s) to a member
// Accepts either { roleId } (custom role) or { role } (simple enum: FOUNDER/ADMIN/MODERATOR/MEMBER)
rolesRouter.post('/:serverId/members/:memberId/roles', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { roleId, role } = req.body;

    // Simple role enum assignment (FOUNDER/ADMIN/MODERATOR/MEMBER)
    if (role) {
      const validRoles = ['FOUNDER', 'ADMIN', 'MODERATOR', 'MEMBER'];
      if (!validRoles.includes(role)) throw new HttpError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);

      const member = await prisma.serverMember.findFirst({
        where: { userId: memberId },
      });
      if (!member) throw new HttpError(404, 'Member not found in this server.');

      await prisma.serverMember.update({
        where: { id: member.id },
        data: { role },
      });

      // Invalidate cached membership so new role takes effect immediately
      await invalidateMembershipCache(memberId, member.serverId);

      return res.status(200).json({ ok: true, role });
    }

    // Custom role assignment via roleId
    if (roleId) {
      const id = `smr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await prisma.serverMemberRole.create({
        data: {
          id,
          serverMemberId: memberId,
          roleId,
        },
      });
      return res.status(201).json({ ok: true });
    }

    throw new HttpError(400, 'Either roleId or role is required.');
  } catch (err) { next(err); }
});

// DELETE /api/:serverId/members/:memberId/roles/:roleId — remove role from member
rolesRouter.delete('/:serverId/members/:memberId/roles/:roleId', requireAuth, requireServerAdmin(), async (req, res, next) => {
  try {
    const { memberId, roleId } = req.params;
    await prisma.serverMemberRole.deleteMany({
      where: {
        serverMemberId: memberId,
        roleId,
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
