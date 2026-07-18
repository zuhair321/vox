import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import {
  executeModerationAction,
  getMemberPermissions,
  canModerate,
  processWarningEscalation,
  reverseModerationAction,
} from '../services/moderation.service.js';

export const moderationRouter = Router();

async function requireModerator(serverId, userId) {
  const perms = await getMemberPermissions(serverId, userId);
  const moderatorPerms = ['KICK_MEMBERS', 'BAN_MEMBERS', 'TIMEOUT_MEMBERS', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MODERATE_MEMBERS'];
  if (!moderatorPerms.some((p) => (perms & (1n << BigInt(moderatorPerms.indexOf(p)))) !== 0n)) {
    throw new HttpError(403, 'You need moderator permissions.');
  }
}

async function hasAnyModPerm(serverId, userId) {
  const perms = await getMemberPermissions(serverId, userId);
  const modPerms = ['KICK_MEMBERS', 'BAN_MEMBERS', 'TIMEOUT_MEMBERS', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MODERATE_MEMBERS'];
  for (const p of modPerms) {
    const bit = await import('../lib/permissions.js').then((m) => m.Permissions[p]);
    if ((perms & bit) === bit) return true;
  }
  return false;
}

moderationRouter.post('/servers/:serverId/moderation/kick', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { targetId, reason } = req.body;
    if (!targetId) throw new HttpError(400, 'targetId is required');
    const log = await executeModerationAction('KICK', serverId, req.user.id, targetId, { reason });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

moderationRouter.post('/servers/:serverId/moderation/ban', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { targetId, reason, deleteMessageDays } = req.body;
    if (!targetId) throw new HttpError(400, 'targetId is required');
    const log = await executeModerationAction('BAN', serverId, req.user.id, targetId, { reason, deleteMessageDays });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

moderationRouter.post('/servers/:serverId/moderation/timeout', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { targetId, duration, reason } = req.body;
    if (!targetId || !duration) throw new HttpError(400, 'targetId and duration are required');
    const log = await executeModerationAction('TIMEOUT', serverId, req.user.id, targetId, { reason, duration });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

moderationRouter.post('/servers/:serverId/moderation/warn', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { targetId, reason } = req.body;
    if (!targetId) throw new HttpError(400, 'targetId is required');
    const log = await executeModerationAction('WARN', serverId, req.user.id, targetId, { reason });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

moderationRouter.post('/servers/:serverId/moderation/mute', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { targetId, reason } = req.body;
    if (!targetId) throw new HttpError(400, 'targetId is required');
    const log = await executeModerationAction('MUTE', serverId, req.user.id, targetId, { reason });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

moderationRouter.post('/servers/:serverId/moderation/deafen', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { targetId, reason } = req.body;
    if (!targetId) throw new HttpError(400, 'targetId is required');
    const log = await executeModerationAction('DEAFEN', serverId, req.user.id, targetId, { reason });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

moderationRouter.get('/servers/:serverId/moderation/log', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const perms = await getMemberPermissions(serverId, req.user.id);
    const { hasPermission: hp } = await import('../lib/permissions.js');
    const canView = hp(perms, 'VIEW_MODERATION_LOG') || hp(perms, 'ADMINISTRATOR') || hasAnyModPerm(serverId, req.user.id);
    if (!canView) throw new HttpError(403, 'You need the View Moderation Log permission.');

    const { targetId, action, moderatorId, before, after, limit = '50' } = req.query;
    const where = { serverId };
    if (targetId) where.targetId = String(targetId);
    if (action) where.action = String(action);
    if (moderatorId) where.moderatorId = String(moderatorId);
    if (before) where.createdAt = { lt: new Date(String(before)) };
    if (after) where.createdAt = { gt: new Date(String(after)) };

    const logs = await prisma.moderationLog.findMany({
      where,
      include: {
        moderator: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 100),
    });

    const total = await prisma.moderationLog.count({ where: { serverId } });
    res.json({ logs, total });
  } catch (e) { next(e); }
});

moderationRouter.post('/servers/:serverId/moderation/appeals', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { logId, reason, evidence } = req.body;

    const log = await prisma.moderationLog.findUnique({ where: { id: logId } });
    if (!log || log.serverId !== serverId) throw new HttpError(404, 'Log not found');
    if (log.targetId !== req.user.id) throw new HttpError(403, 'Not your action');
    if (log.appealed) throw new HttpError(400, 'Already appealed');

    const appeal = await prisma.appeal.create({
      data: {
        moderationLogId: logId,
        reason,
        evidence,
      },
    });

    await prisma.moderationLog.update({
      where: { id: logId },
      data: { appealed: true, appealStatus: 'PENDING' },
    });

    res.status(201).json(appeal);
  } catch (e) { next(e); }
});

moderationRouter.patch('/servers/:serverId/moderation/appeals/:appealId', requireAuth, async (req, res, next) => {
  try {
    const { serverId, appealId } = req.params;
    const { decision, notes } = req.body;

    const perms = await getMemberPermissions(serverId, req.user.id);
    const { hasPermission: hp } = await import('../lib/permissions.js');
    if (!hp(perms, 'MODERATE_MEMBERS') && !hp(perms, 'ADMINISTRATOR')) {
      throw new HttpError(403, 'You need the Moderate Members permission.');
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: { log: true },
    });
    if (!appeal || appeal.log.serverId !== serverId) throw new HttpError(404, 'Appeal not found');

    const updatedAppeal = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        stage: decision,
        reviewerId: req.user.id,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
    });

    await prisma.moderationLog.update({
      where: { id: appeal.moderationLogId },
      data: { appealStatus: decision === 'APPROVED' ? 'APPROVED' : 'DENIED' },
    });

    if (decision === 'APPROVED') {
      await reverseModerationAction({
        action: appeal.log.action,
        serverId: appeal.log.serverId,
        targetId: appeal.log.targetId,
      });
    }

    res.json(updatedAppeal);
  } catch (e) { next(e); }
});

// GET /api/servers/:serverId/members/:userId — member moderation state (for MemberModCard / TimeoutTimer)
moderationRouter.get('/servers/:serverId/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const { serverId, userId } = req.params;
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    if (!member) throw new HttpError(404, 'Member not found');
    res.json({
      id: member.id,
      serverId: member.serverId,
      userId: member.userId,
      nick: member.nick,
      mutedUntil: member.mutedUntil,
      deafened: member.deafened,
      timeoutUntil: member.timeoutUntil,
      customPowers: member.customPowers,
      user: member.user,
    });
  } catch (e) { next(e); }
});

// GET /api/servers/:serverId/escalation-rules — warning escalation configuration
moderationRouter.get('/servers/:serverId/escalation-rules', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const perms = await getMemberPermissions(serverId, req.user.id);
    if (!hasAnyModPerm(serverId, req.user.id) && !(await import('../lib/permissions.js')).hasPermission(perms, 'ADMINISTRATOR')) {
      throw new HttpError(403, 'You need moderator permissions.');
    }
    const config = await prisma.moderationConfig.findUnique({ where: { serverId } });
    res.json({ rules: config?.escalationRules ?? null });
  } catch (e) { next(e); }
});

// POST /api/servers/:serverId/escalation-rules — update escalation configuration
moderationRouter.post('/servers/:serverId/escalation-rules', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const perms = await getMemberPermissions(serverId, req.user.id);
    if (!hasAnyModPerm(serverId, req.user.id) && !(await import('../lib/permissions.js')).hasPermission(perms, 'ADMINISTRATOR')) {
      throw new HttpError(403, 'You need moderator permissions.');
    }
    const { rules } = req.body;
    if (!Array.isArray(rules)) throw new HttpError(400, 'rules must be an array.');
    const config = await prisma.moderationConfig.upsert({
      where: { serverId },
      create: { serverId, escalationRules: rules },
      update: { escalationRules: rules },
    });
    res.json({ rules: config.escalationRules });
  } catch (e) { next(e); }
});

// GET /api/servers/:serverId/quarantine — pending quarantined messages (QUARANTINE moderation logs)
moderationRouter.get('/servers/:serverId/quarantine', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const perms = await getMemberPermissions(serverId, req.user.id);
    if (!hasAnyModPerm(serverId, req.user.id) && !(await import('../lib/permissions.js')).hasPermission(perms, 'ADMINISTRATOR')) {
      throw new HttpError(403, 'You need moderator permissions.');
    }
    const logs = await prisma.moderationLog.findMany({
      where: { serverId, action: 'QUARANTINE' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items: logs });
  } catch (e) { next(e); }
});

moderationRouter.delete('/servers/:serverId/moderation/:logId/appeal', requireAuth, async (req, res, next) => {
  try {
    const { serverId, logId } = req.params;
    const log = await prisma.moderationLog.findUnique({ where: { id: logId } });
    if (!log || log.serverId !== serverId) throw new HttpError(404, 'Log not found');
    if (log.targetId !== req.user.id) throw new HttpError(403, 'Not your action');

    await prisma.appeal.deleteMany({ where: { moderationLogId: logId } });
    await prisma.moderationLog.update({
      where: { id: logId },
      data: { appealed: false, appealReason: null, appealStatus: 'NONE' },
    });

    res.json({ deleted: true });
  } catch (e) { next(e); }
});
