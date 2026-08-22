// External integrations registry (Slack / Spotify / Calendar / Discord / Matrix).
// Connections are stored per-user (or per-server) and surfaced so the client
// and backend can forward events outward. Token-heavy config is env-gated and
// should be encrypted at rest by the caller before being stored in `config`.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const integrationsRouter = Router();

const VALID_TYPES = ['SLACK', 'SPOTIFY', 'CALENDAR', 'DISCORD', 'MATRIX'];

// List the current user's connected integrations.

// Rate limiting
integrationsRouter.use(rateLimit);

integrationsRouter.get('/integrations', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.integration.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ integrations: items.map(stripSecrets) });
  } catch (e) { next(e); }
});

// Connect an integration. `config` is free-form (webhook url, tokens, etc.).
integrationsRouter.post('/integrations', requireAuth, async (req, res, next) => {
  try {
    const { type, name, config, serverId } = req.body || {};
    if (!VALID_TYPES.includes(type)) throw new HttpError(400, 'Invalid integration type.');
    if (serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: req.user.id } },
      });
      if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
        throw new HttpError(403, 'Server admin access required.');
      }
    }
    const integration = await prisma.integration.create({
      data: {
        userId: req.user.id,
        serverId: serverId || null,
        type,
        name: String(name || type).slice(0, 100),
        config: config ? JSON.parse(JSON.stringify(config)) : undefined,
      },
    });
    res.status(201).json({ integration: stripSecrets(integration) });
  } catch (e) { next(e); }
});

// Toggle / update an integration.
integrationsRouter.patch('/integrations/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.integration.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) throw new HttpError(404, 'Integration not found.');
    const update = {};
    if (typeof req.body?.enabled === 'boolean') update.enabled = req.body.enabled;
    if (req.body?.config) update.config = JSON.parse(JSON.stringify(req.body.config));
    if (typeof req.body?.name === 'string') update.name = req.body.name.slice(0, 100);
    const updated = await prisma.integration.update({ where: { id: req.params.id }, data: update });
    res.json({ integration: stripSecrets(updated) });
  } catch (e) { next(e); }
});

integrationsRouter.delete('/integrations/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.integration.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Forward the latest message in a server channel to that server's connected
// Slack/Discord integrations (outbound bridge). Fire-and-forget.
integrationsRouter.post('/integrations/forward/:channelId', requireAuth, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!channel?.serverId) throw new HttpError(404, 'Channel not found.');
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId: req.user.id } },
    });
    if (!member) throw new HttpError(403, 'Not a member.');

    const integrations = await prisma.integration.findMany({
      where: { serverId: channel.serverId, enabled: true, type: { in: ['SLACK', 'DISCORD'] } },
    });
    const text = String(req.body?.text || '');
    for (const it of integrations) {
      const webhook = it.config?.webhook;
      if (!webhook) continue;
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `[VOX] ${req.user.username}: ${text}`.slice(0, 1900) }),
      }).catch(() => {});
    }
    res.json({ forwarded: integrations.length });
  } catch (e) { next(e); }
});

function stripSecrets(i) {
  const config = i.config || {};
  const safe = { ...config };
  if (safe.token) safe.token = '***';
  if (safe.webhook) safe.webhook = '***';
  return { id: i.id, type: i.type, name: i.name, serverId: i.serverId, enabled: i.enabled, config: safe, createdAt: i.createdAt };
}
