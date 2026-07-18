import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { Permissions, hasPermission, combinePermissions } from '../lib/permissions.js';
import { ModerationActionType, AppealStatus } from '@prisma/client';

export async function getMemberPermissions(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    include: { roles: { include: { role: true } } },
  });

  if (!member) return 0n;

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { ownerId: true },
  });

  if (server?.ownerId === userId) {
    return Object.values(Permissions).reduce((a, b) => a | b, 0n);
  }

  return member.roles.reduce((acc, mr) => acc | BigInt(mr.role.permissions), 0n);
}

export async function getMyHighestRolePosition(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    include: { roles: { include: { role: true } } },
  });

  if (!member) return 0;
  return Math.max(...member.roles.map((r) => r.role.position), 0);
}

export async function canModerate(serverId, moderatorId, targetId) {
  if (moderatorId === targetId) return false;

  const [modMember, targetMember, server] = await Promise.all([
    prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: moderatorId } },
      include: { roles: { include: { role: true } } },
    }),
    prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: targetId } },
      include: { roles: { include: { role: true } } },
    }),
    prisma.server.findUnique({ where: { id: serverId } }),
  ]);

  if (server?.ownerId === moderatorId) return true;
  if (server?.ownerId === targetId) return false;

  const modHighest = Math.max(...(modMember?.roles.map((r) => r.role.position) ?? [0]));
  const targetHighest = Math.max(...(targetMember?.roles.map((r) => r.role.position) ?? [0]));

  return modHighest > targetHighest;
}

function getRequiredPermission(action) {
  switch (action) {
    case 'KICK':
      return 'KICK_MEMBERS';
    case 'BAN':
    case 'TEMPBAN':
    case 'UNBAN':
      return 'BAN_MEMBERS';
    case 'TIMEOUT':
    case 'UNTIMEOUT':
      return 'TIMEOUT_MEMBERS';
    case 'MUTE':
    case 'UNMUTE':
      return 'MUTE_MEMBERS';
    case 'DEAFEN':
    case 'UNDEAFEN':
      return 'DEAFEN_MEMBERS';
    case 'WARN':
      return 'MODERATE_MEMBERS';
    case 'ROLE_ASSIGN':
    case 'ROLE_REMOVE':
      return 'MANAGE_ROLES';
    default:
      return 'MODERATE_MEMBERS';
  }
}

export async function executeModerationAction(
  action,
  serverId,
  moderatorId,
  targetId,
  options = {}
) {
  const perms = await getMemberPermissions(serverId, moderatorId);
  const requiredPerm = getRequiredPermission(action);
  if (!hasPermission(perms, requiredPerm)) {
    throw new HttpError(403, `You need the ${requiredPerm} permission.`);
  }

  if (!['UNBAN', 'UNTIMEOUT', 'UNMUTE', 'UNDEAFEN'].includes(action)) {
    const canMod = await canModerate(serverId, moderatorId, targetId);
    if (!canMod) throw new HttpError(403, 'You cannot moderate this user.');
  }

  const log = await prisma.moderationLog.create({
    data: {
      serverId,
      action,
      targetId,
      moderatorId,
      reason: options.reason,
      duration: options.duration,
      evidence: options.channelId ? { channelId: options.channelId } : null,
      expiresAt: options.duration ? new Date(Date.now() + options.duration * 60 * 1000) : null,
    },
  });

  switch (action) {
    case 'KICK':
      await kickMember(serverId, targetId);
      break;
    case 'BAN':
      await banMember(serverId, targetId, options.deleteMessageDays ?? 0);
      break;
    case 'TEMPBAN':
      await tempBanMember(serverId, targetId, options.duration, options.deleteMessageDays ?? 0);
      break;
    case 'TIMEOUT':
      await timeoutMember(serverId, targetId, options.duration);
      break;
    case 'MUTE':
      await muteMember(serverId, targetId);
      break;
    case 'DEAFEN':
      await deafenMember(serverId, targetId);
      break;
    case 'WARN':
      await warnMember(serverId, targetId, options.reason);
      break;
    case 'UNBAN':
      await prisma.serverBan.deleteMany({ where: { serverId, userId: targetId } });
      break;
    case 'UNTIMEOUT':
      await prisma.serverMember.updateMany({
        where: { serverId_userId: { serverId, userId: targetId } },
        data: { timeoutUntil: null },
      });
      break;
    case 'UNMUTE':
      await prisma.serverMember.updateMany({
        where: { serverId_userId: { serverId, userId: targetId } },
        data: { mutedUntil: null },
      });
      break;
    case 'UNDEAFEN':
      await prisma.serverMember.updateMany({
        where: { serverId_userId: { serverId, userId: targetId } },
        data: { deafened: false },
      });
      break;
  }

  await prisma.auditLog.create({
    data: {
      serverId,
      userId: moderatorId,
      action: `MODERATION_${action}`,
      targetId,
      details: { action, reason: options.reason, duration: options.duration },
    },
  }).catch(() => {});

  return log;
}

async function kickMember(serverId, userId) {
  await prisma.serverMember.delete({
    where: { serverId_userId: { serverId, userId } },
  }).catch(() => {});
}

async function banMember(serverId, userId, deleteMessageDays) {
  await prisma.serverBan.create({
    data: { serverId, userId, deleteMessageDays },
  }).catch(() => {});
  await prisma.serverMember.deleteMany({ where: { serverId, userId } }).catch(() => {});
}

async function tempBanMember(serverId, userId, duration, deleteMessageDays) {
  await prisma.serverBan.create({
    data: {
      serverId,
      userId,
      deleteMessageDays,
      expiresAt: new Date(Date.now() + duration * 60 * 1000),
    },
  }).catch(() => {});
  await prisma.serverMember.deleteMany({ where: { serverId, userId } }).catch(() => {});
}

async function timeoutMember(serverId, userId, duration) {
  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId } },
    data: { timeoutUntil: new Date(Date.now() + duration * 60 * 1000) },
  }).catch(() => {});
}

async function muteMember(serverId, userId) {
  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId } },
    data: { mutedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  }).catch(() => {});
}

async function deafenMember(serverId, userId) {
  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId } },
    data: { deafened: true },
  }).catch(() => {});
}

async function warnMember(serverId, userId, reason) {
  const warnCount = await prisma.moderationLog.count({
    where: { serverId, targetId: userId, action: 'WARN' },
  });

  if (warnCount >= 4) {
    await executeModerationAction('KICK', serverId, 'system', userId, {
      reason: `Auto-kick: reached ${warnCount + 1} warnings.`,
    });
  } else if (warnCount >= 2) {
    await executeModerationAction('TIMEOUT', serverId, 'system', userId, {
      duration: 60,
      reason: `Auto-timeout: reached ${warnCount + 1} warnings.`,
    });
  }
}

export async function reverseModerationAction(log) {
  switch (log.action) {
    case 'BAN':
    case 'TEMPBAN':
      await prisma.serverBan.deleteMany({
        where: { serverId: log.serverId, userId: log.targetId },
      });
      break;
    case 'TIMEOUT':
      await prisma.serverMember.updateMany({
        where: { serverId_userId: { serverId: log.serverId, userId: log.targetId } },
        data: { timeoutUntil: null },
      });
      break;
    case 'MUTE':
      await prisma.serverMember.updateMany({
        where: { serverId_userId: { serverId: log.serverId, userId: log.targetId } },
        data: { mutedUntil: null },
      });
      break;
    case 'DEAFEN':
      await prisma.serverMember.updateMany({
        where: { serverId_userId: { serverId: log.serverId, userId: log.targetId } },
        data: { deafened: false },
      });
      break;
  }
}

export async function logModerationAction(
  serverId,
  moderatorId,
  targetId,
  action,
  reason
) {
  await prisma.auditLog.create({
    data: {
      serverId,
      userId: moderatorId,
      action,
      targetId: targetId ?? undefined,
      details: { reason },
    },
  }).catch(() => {});
}

export async function processWarningEscalation(serverId, userId) {
  const warnings = await prisma.moderationLog.count({
    where: {
      serverId,
      targetId: userId,
      action: 'WARN',
      createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  if (warnings >= 5) {
    await executeModerationAction('BAN', serverId, 'system', userId, {
      reason: `Auto-escalation: ${warnings} warnings reached`,
    });
  } else if (warnings >= 3) {
    await executeModerationAction('TIMEOUT', serverId, 'system', userId, {
      duration: 360,
      reason: `Auto-escalation: ${warnings} warnings reached`,
    });
  } else if (warnings >= 2) {
    await executeModerationAction('TIMEOUT', serverId, 'system', userId, {
      duration: 60,
      reason: `Auto-escalation: ${warnings} warnings reached`,
    });
  }
}
