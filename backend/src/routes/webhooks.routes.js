import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { emitAll } from '../sockets/index.js';
import { deliverWebhooks } from '../services/webhook.service.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const webhooksRouter = Router();

async function requireAdmin(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Not authorized');
  }
}

// GET /api/servers/:id/webhooks

// Rate limiting
webhooksRouter.use(rateLimit);

webhooksRouter.get('/servers/:id/webhooks', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    await requireAdmin(serverId, req.user.id);

    const webhooks = await prisma.webhook.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ webhooks });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/webhooks
webhooksRouter.post('/servers/:id/webhooks', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { name, channelId, url } = req.body || {};

    if (!name || typeof name !== 'string') throw new HttpError(400, 'name is required');
    if (!channelId || typeof channelId !== 'string') throw new HttpError(400, 'channelId is required');
    if (url && typeof url !== 'string') throw new HttpError(400, 'url must be a string');
    // Basic URL validation
    if (url && !/^https?:\/\/.+/i.test(url)) throw new HttpError(400, 'url must start with http:// or https://');

    await requireAdmin(serverId, req.user.id);

    const channel = await prisma.channel.findUnique({
      where: { id: channelId, serverId },
    });
    if (!channel) throw new HttpError(404, 'Channel not found in this server');

    const webhook = await prisma.webhook.create({
      data: {
        serverId,
        channelId,
        name: name.trim(),
        url: url || null,
        token: crypto.randomUUID(),
      },
    });

    res.status(201).json({ webhook });
  } catch (e) { next(e); }
});

// PATCH /api/servers/:id/webhooks/:webhookId — update name or url
webhooksRouter.patch('/servers/:id/webhooks/:webhookId', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const webhookId = req.params.webhookId;
    const { name, url } = req.body || {};

    await requireAdmin(serverId, req.user.id);

    const existing = await prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!existing || existing.serverId !== serverId) throw new HttpError(404, 'Webhook not found');

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (url !== undefined) {
      if (url && !/^https?:\/\/.+/i.test(url)) throw new HttpError(400, 'url must start with http:// or https://');
      updates.url = url || null;
    }

    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: updates,
    });

    res.json({ webhook });
  } catch (e) { next(e); }
});

// DELETE /api/servers/:id/webhooks/:webhookId
webhooksRouter.delete('/servers/:id/webhooks/:webhookId', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const webhookId = req.params.webhookId;

    await requireAdmin(serverId, req.user.id);

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });
    if (!webhook || webhook.serverId !== serverId) throw new HttpError(404, 'Webhook not found');

    await prisma.webhook.delete({ where: { id: webhookId } });

    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// POST /api/webhooks/:token - receive message via webhook
webhooksRouter.post('/webhooks/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const content = String(req.body?.content || req.body?.body || '').trim();

    if (!content) throw new HttpError(400, 'Message content is required');

    const webhook = await prisma.webhook.findUnique({
      where: { token },
    });
    if (!webhook) throw new HttpError(404, 'Webhook not found');

    const message = await prisma.message.create({
      data: {
        channelId: webhook.channelId,
        body: content.slice(0, 2000),
        userId: null,
        authorOverride: webhook.name,
      },
      include: { author: true, reactions: true },
    });

    emitAll('message:new', { message });

    res.status(201).json({ message });
  } catch (e) { next(e); }
});
