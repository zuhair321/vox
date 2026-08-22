// Notifications: per-user mute of servers/channels + web-push subscription
// registration. Email/mention delivery is best-effort and env-gated.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const notificationsRouter = Router();

// GET /api/users/me/notifications — list this user's mutes + push registration.

// Rate limiting
notificationsRouter.use(rateLimit);

notificationsRouter.get('/users/me/notifications', requireAuth, async (req, res, next) => {
  try {
    const mutes = await prisma.notificationSettings.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    const push = await prisma.pushSubscription.count({ where: { userId: req.user.id } });
    res.json({ mutes, pushRegistered: push > 0 });
  } catch (e) { next(e); }
});

// PUT /api/users/me/notifications/mute — mute or unmute a server or channel.
notificationsRouter.put('/users/me/notifications/mute', requireAuth, async (req, res, next) => {
  try {
    const { serverId, channelId, muted } = req.body || {};
    if (!serverId && !channelId) throw new HttpError(400, 'serverId or channelId required');
    if (typeof muted !== 'boolean') throw new HttpError(400, 'muted must be a boolean');

    // Validate membership/access when scoping to a server/channel.
    if (serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: req.user.id } },
      });
      if (!member) throw new HttpError(403, 'You are not a member of that server.');
    }
    if (channelId) {
      const ch = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
      if (ch?.serverId) {
        const member = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId: ch.serverId, userId: req.user.id } },
        });
        if (!member) throw new HttpError(403, 'You are not a member of that channel.');
      }
    }

    const setting = await prisma.notificationSettings.upsert({
      where: { userId_serverId_channelId: { userId: req.user.id, serverId: serverId || null, channelId: channelId || null } },
      create: { userId: req.user.id, serverId: serverId || null, channelId: channelId || null, muted },
      update: { muted },
    });
    res.json({ ok: true, setting });
  } catch (e) { next(e); }
});

// DELETE /api/users/me/notifications/mute/:id
notificationsRouter.delete('/users/me/notifications/mute/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.notificationSettings.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/push/subscribe — register a browser Web Push subscription.
notificationsRouter.post('/push/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, p256dh, auth } = req.body || {};
    if (!endpoint || !p256dh || !auth) throw new HttpError(400, 'endpoint, p256dh and auth are required');
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: req.user.id, endpoint, p256dh, auth },
      update: { userId: req.user.id, p256dh, auth },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE /api/push/unsubscribe
notificationsRouter.delete('/push/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) throw new HttpError(400, 'endpoint required');
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});


// PUT /api/users/me/notifications/level
// Body: { serverId?, channelId?, level: 'ALL'|'MENTIONS'|'NOTHING'|'DEFAULT' }
// Establishes the user's effective notification preference for a server or channel.
notificationsRouter.put('/users/me/notifications/level', requireAuth, async (req, res, next) => {
  try {
    const { serverId, channelId, level } = req.body || {};
    if (!serverId && !channelId) throw new HttpError(400, 'serverId or channelId is required.');
    const ALLOWED = ['ALL', 'MENTIONS', 'NOTHING', 'DEFAULT'];
    if (!ALLOWED.includes(level)) throw new HttpError(400, 'level must be one of: ' + ALLOWED.join(', '));

    if (serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: req.user.id } },
      });
      if (!member) throw new HttpError(403, 'Not a member.');
    }
    if (channelId) {
      const ch = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
      if (ch && ch.serverId) {
        const member = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId: ch.serverId, userId: req.user.id } },
        });
        if (!member) throw new HttpError(403, 'Not a member.');
      }
    }
    const existing = await prisma.notificationSettings.findFirst({
      where: { userId: req.user.id, serverId: serverId || null, channelId: channelId || null }
    });
    const data = { level, muted: level === 'NOTHING' };
    const setting = existing
      ? await prisma.notificationSettings.update({ where: { id: existing.id }, data })
      : await prisma.notificationSettings.create({ data: { userId: req.user.id, serverId: serverId || null, channelId: channelId || null, ...data } });
    res.json({ ok: true, setting });
  } catch (e) { next(e); }
});
