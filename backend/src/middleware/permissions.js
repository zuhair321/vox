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
 */
export async function checkChannelPermission(userId, channelId, action) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { server: { select: { ownerId: true } }, permissions: true },
  });

  if (!channel) return false;
  if (!channel.serverId) return true; // DM channels — no server permissions
  if (!channel.server) return false;

  // Server owner always has all permissions
  if (channel.server.ownerId === userId) return true;

  // Cached membership lookup — avoids full member list fetch
  const membership = await getMembership(userId, channel.serverId);
  if (!membership) return false; // Not a member

  const role = membership.role;
  const userPower = ROLE_POWER[role] || 0;

  // Check channel-specific permission overrides first
  const override = channel.permissions.find((p) => p.role === role);
  if (override) {
    if (action === 'read') return override.canRead;
    if (action === 'write') return override.canWrite;
    if (action === 'manage') return override.canManage || override.canAdmin;
    if (action === 'admin') return override.canAdmin;
  }

  // Default permissions based on role
  if (action === 'read') return true; // Everyone can read by default
  if (action === 'write') return userPower >= 1; // MEMBER+ can write
  if (action === 'manage') return userPower >= 2; // MODERATOR+ can manage
  if (action === 'admin') return userPower >= 3; // ADMIN+ can admin

  return false;
}

/**
 * Express middleware factory. Throws 403 if permission check fails.
 */
export function requirePermission(action) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'Authentication required.');

      // Try to get channelId from body, params, or query
      const channelId = req.body?.channelId || req.params?.channelId || req.query?.channelId;
      if (!channelId) {
        // If no channelId, allow (might be a non-channel route using this middleware)
        return next();
      }

      const hasPermission = await checkChannelPermission(userId, channelId, action);
      if (!hasPermission) {
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
  // Quick owner check first (no DB)
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { ownerId: true },
  });
  if (!server) return false;
  if (server.ownerId === userId) return true;

  // Cached membership lookup
  const membership = await getMembership(userId, serverId);
  if (!membership) return false;

  const userPower = ROLE_POWER[membership.role] || 0;

  if (action === 'kick') return userPower >= 2; // MODERATOR+
  if (action === 'ban') return userPower >= 3; // ADMIN+
  if (action === 'manageRoles') return userPower >= 3; // ADMIN+
  if (action === 'manageChannels') return userPower >= 3; // ADMIN+
  if (action === 'manageServer') return userPower >= 3; // ADMIN+

  return false;
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

      const { serverId } = req.params;
      if (!serverId) throw new HttpError(400, 'serverId is required.');

      const hasPermission = await checkServerPermission(userId, serverId, 'manageRoles');
      if (!hasPermission) throw new HttpError(403, 'Server admin access required.');

      next();
    } catch (e) {
      next(e);
    }
  };
}
