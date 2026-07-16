// Notifications: per-user mute of servers/channels + web-push subscription
// registration. Email/mention delivery is best-effort and env-gated.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const notificationsRouter = Router();

// GET /api/users/me/notifications — list this user's mutes + push registration.
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
