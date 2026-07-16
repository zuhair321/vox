// Thread / channel archives.
//   GET    /api/channels/:id/archive          → get archive config for a channel
//   PUT    /api/channels/:id/archive          → set archive config
//   GET    /api/channels/:id/archive/messages → list messages older than the
//                                               retention window (the "archive")
//
// Archiving is view-based: messages older than `daysToKeep` are treated as
// archived (read-only view). No message is deleted; the cutoff is computed at
// query time so the schema needs no extra columns.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const archivesRouter = Router();

// GET /api/channels/:id/archive
archivesRouter.get('/channels/:id/archive', requireAuth, requirePermission('read'), async (req, res, next) => {
  try {
    const config = await prisma.channelArchiveConfig.findUnique({
      where: { channelId: req.params.id },
    });
    res.json({
      config: config
        ? {
            enabled: config.enabled,
            daysToKeep: config.daysToKeep,
            lastArchivedAt: config.lastArchivedAt ? config.lastArchivedAt.toISOString() : null,
          }
        : { enabled: false, daysToKeep: 90, lastArchivedAt: null },
    });
  } catch (e) { next(e); }
});

// PUT /api/channels/:id/archive
archivesRouter.put('/channels/:id/archive', requireAuth, requirePermission('manage'), async (req, res, next) => {
  try {
    const channelId = req.params.id;
    const { enabled, daysToKeep } = req.body || {};

    const data = {};
    if (typeof enabled === 'boolean') data.enabled = enabled;
    if (typeof daysToKeep === 'number') {
      if (daysToKeep < 1 || daysToKeep > 3650) throw new HttpError(400, 'daysToKeep must be between 1 and 3650.');
      data.daysToKeep = Math.floor(daysToKeep);
    }

    const config = await prisma.channelArchiveConfig.upsert({
      where: { channelId },
      create: { channelId, ...data },
      update: data,
    });

    res.json({
      config: {
        enabled: config.enabled,
        daysToKeep: config.daysToKeep,
        lastArchivedAt: config.lastArchivedAt ? config.lastArchivedAt.toISOString() : null,
      },
    });
  } catch (e) { next(e); }
});

// GET /api/channels/:id/archive/messages
archivesRouter.get('/channels/:id/archive/messages', requireAuth, requirePermission('read'), async (req, res, next) => {
  try {
    const config = await prisma.channelArchiveConfig.findUnique({
      where: { channelId: req.params.id },
    });
    const daysToKeep = config?.daysToKeep || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const messages = await prisma.message.findMany({
      where: { channelId: req.params.id, deleted: false, createdAt: { lt: cutoff } },
      include: { author: true, reactions: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ messages, cutoff: cutoff.toISOString() });
  } catch (e) { next(e); }
});
