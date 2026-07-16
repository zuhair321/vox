import { prisma } from '../lib/prisma.js';
import { HttpError } from './error.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

const ROLE_POWER = { FOUNDER: 4, ADMIN: 3, MODERATOR: 2, MEMBER: 1 };
const MEMBERSHIP_CACHE_TTL = 120; // 2 min — membership changes are rare

/**
 * Cached membership lookup: returns { serverId, ownerId, role } or null.
 * Cached in Redis (keyed by userId:serverId) for 2 minutes.
 */
async function getMembership(userId, serverId) {
  const cacheKey = `vox:membership:${userId}:${serverId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    include: { server: { select: { ownerId: true } } },
  });

  const result = member
    ? { role: member.role, ownerId: member.server?.ownerId }
    : null;

  await cacheSet(cacheKey, result, MEMBERSHIP_CACHE_TTL);
  return result;
}

/**
 * Invalidate cached membership when a user's role changes.
 * Called by role assignment / kick / ban routes.
 */
export async function invalidateMembershipCache(userId, serverId) {
  const { cacheInvalidate } = await import('../lib/redis.js');
  await cacheInvalidate(`vox:membership:${userId}:${serverId}`);
}

/**
 * Check if a user has permission to perform an action in a channel.
 * Respects channel-specific Permission overrides and role hierarchy.
 * Uses Redis-cached membership lookups to avoid N+1 DB hits on every request.
 * Returns { allowed: boolean, channel: Channel | null }
 */
export async function checkChannelPermission(userId, channelId, action) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { server: { select: { ownerId: true } }, permissions: true },
  });

  if (!channel) return { allowed: false, channel: null };
  if (!channel.serverId) return { allowed: true, channel }; // DM channels — no server permissions
  if (!channel.server) return { allowed: false, channel };

  // Server owner always has all permissions
  if (channel.server.ownerId === userId) return { allowed: true, channel };

  // Cached membership lookup — avoids full member list fetch
  const membership = await getMembership(userId, channel.serverId);
  if (!membership) return { allowed: false, channel }; // Not a member

  const role = membership.role;
  const userPower = ROLE_POWER[role] || 0;

  // Check channel-specific permission overrides first
  const override = channel.permissions.find((p) => p.role === role);
  if (override) {
    if (action === 'read') return { allowed: override.canRead, channel };
    if (action === 'write') return { allowed: override.canWrite || override.canAdmin, channel };
    if (action === 'manage') return { allowed: override.canManage || override.canAdmin, channel };
    if (action === 'admin') return { allowed: override.canAdmin, channel };
  }

  // Default permissions based on role
  if (action === 'read') return { allowed: true, channel };
  if (action === 'write') return { allowed: userPower >= 1, channel };
  if (action === 'manage') return { allowed: userPower >= 2, channel };
  if (action === 'admin') return { allowed: userPower >= 3, channel };

  return { allowed: false, channel };
}

/**
 * Express middleware factory. Throws 403 if permission check fails.
 */
export function requirePermission(action) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'Authentication required.');

      const channelId =
        req.body?.channelId || req.params?.channelId || req.params?.id || req.query?.channelId;
      if (!channelId) {
        return next();
      }

      const result = await checkChannelPermission(userId, channelId, action);
      req.channel = result.channel;
      if (!result.allowed) {
        throw new HttpError(403, `You do not have ${action} permission in this channel.`);
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Check server-level permission (kick, ban, manage roles, etc.)
 * Uses cached membership lookup for fast path.
 */
export async function checkServerPermission(userId, serverId, action) {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { ownerId: true },
  });
  if (!server) return { allowed: false, server: null };
  if (server.ownerId === userId) return { allowed: true, server };

  const membership = await getMembership(userId, serverId);
  if (!membership) return { allowed: false, server };

  const userPower = ROLE_POWER[membership.role] || 0;

  if (action === 'kick') return { allowed: userPower >= 2, server };
  if (action === 'ban') return { allowed: userPower >= 3, server };
  if (action === 'manageRoles') return { allowed: userPower >= 3, server };
  if (action === 'manageChannels') return { allowed: userPower >= 3, server };
  if (action === 'manageServer') return { allowed: userPower >= 3, server };

  return { allowed: false, server };
}

/**
 * Express middleware: requires ADMIN+ role (or owner) in the server
 * identified by req.params.serverId.
 */
export function requireServerAdmin() {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'Authentication required.');

      const serverId = req.params.serverId ?? req.params.id;
      if (!serverId) throw new HttpError(400, 'serverId is required.');

      const result = await checkServerPermission(userId, serverId, 'manageRoles');
      req.server = result.server;
      if (!result.allowed) throw new HttpError(403, 'Server admin access required.');

      next();
    } catch (e) {
      next(e);
    }
  };
}
