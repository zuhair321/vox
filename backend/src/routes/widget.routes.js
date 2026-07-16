// Server widget.
//   GET /api/servers/:id/widget            → widget config + embed snippet
//   PUT /api/servers/:id/widget            → update widget settings
//   GET /api/servers/:id/widget/preview   → public preview data (online count)
//
// Generates an embeddable iframe snippet (and JSON) that third-party sites can
// drop in to show a server's online member count + join button.
import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

export const widgetRouter = Router();

function widgetUrl(serverId) {
  const origin = env.corsOrigins?.[0] || `http://127.0.0.1:${env.port || 4000}`;
  return `${origin}/widget/${serverId}`;
}

async function getWidgetConfig(serverId) {
  let config = await prisma.serverWidget.findUnique({ where: { serverId } });
  if (!config) {
    config = await prisma.serverWidget.create({
      data: { serverId, enabled: false, theme: 'dark', showOnline: true, showJoin: true },
    });
  }
  return config;
}

// GET /api/servers/:id/widget — owner/admin config + embed code
widgetRouter.get('/servers/:id/widget', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new HttpError(404, 'Server not found.');
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
      throw new HttpError(403, 'Only server admins can manage the widget.');
    }

    const config = await getWidgetConfig(serverId);
    const url = widgetUrl(serverId);
    const embedCode = `<iframe src="${url}" width="350" height="500" frameborder="0" allowtransparency="true"></iframe>`;

    res.json({
      config: {
        enabled: config.enabled,
        theme: config.theme,
        showOnline: config.showOnline,
        showJoin: config.showJoin,
      },
      url,
      embedCode,
    });
  } catch (e) { next(e); }
});

// PUT /api/servers/:id/widget — update settings
widgetRouter.put('/servers/:id/widget', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
      throw new HttpError(403, 'Only server admins can manage the widget.');
    }

    const { enabled, theme, showOnline, showJoin } = req.body || {};
    const data = {};
    if (typeof enabled === 'boolean') data.enabled = enabled;
    if (typeof theme === 'string' && ['dark', 'light'].includes(theme)) data.theme = theme;
    if (typeof showOnline === 'boolean') data.showOnline = showOnline;
    if (typeof showJoin === 'boolean') data.showJoin = showJoin;

    await getWidgetConfig(serverId);
    const config = await prisma.serverWidget.upsert({
      where: { serverId },
      create: { serverId, ...data },
      update: data,
    });

    res.json({
      config: {
        enabled: config.enabled,
        theme: config.theme,
        showOnline: config.showOnline,
        showJoin: config.showJoin,
      },
    });
  } catch (e) { next(e); }
});

// GET /api/servers/:id/widget/preview — public (no auth) data for the embed
widgetRouter.get('/servers/:id/widget/preview', optionalAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: { name: true, icon: true, description: true, isPublic: true },
    });
    if (!server) throw new HttpError(404, 'Server not found.');

    const config = await prisma.serverWidget.findUnique({ where: { serverId } });
    if (!config || !config.enabled) {
      return res.status(403).json({ error: 'Widget is disabled for this server.' });
    }

    const total = await prisma.serverMember.count({ where: { serverId } });
    const online = await prisma.serverMember.count({
      where: { serverId, user: { status: { in: ['ONLINE', 'IDLE', 'DND'] } } },
    });

    res.json({
      server: { name: server.name, icon: server.icon, description: server.description },
      online,
      total,
      config: { theme: config.theme, showOnline: config.showOnline, showJoin: config.showJoin },
    });
  } catch (e) { next(e); }
});
