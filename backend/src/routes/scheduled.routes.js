// Scheduled messages.
//   POST   /api/messages/scheduled            → schedule a message
//   GET    /api/messages/scheduled            → list my scheduled messages
//   GET    /api/channels/:id/scheduled        → list scheduled messages in a channel
//   DELETE /api/messages/scheduled/:id        → cancel a scheduled message
//
// A background worker (lib/scheduled.worker.js) polls for due messages and
// delivers them into the channel as normal messages.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getIO } from '../sockets/index.js';
import { emitRealtimeEvent } from '../lib/redis_bridge.js';
import { requirePermission } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';
import { normalizeAttachments } from '../lib/attachments.js';

export const scheduledRouter = Router();

// POST /api/messages/scheduled
scheduledRouter.post('/messages/scheduled', requireAuth, requirePermission('write'), async (req, res, next) => {
  try {
    const { channelId, body, scheduledAt, attachments } = req.body || {};
    if (!channelId) throw new HttpError(400, 'channelId is required.');
    if (!body || !String(body).trim()) throw new HttpError(400, 'Message body is required.');

    const when = scheduledAt ? new Date(scheduledAt) : null;
    if (!when || isNaN(when.getTime())) throw new HttpError(400, 'A valid scheduledAt timestamp is required.');
    if (when.getTime() <= Date.now()) throw new HttpError(400, 'scheduledAt must be in the future.');

    const normalized = normalizeAttachments(attachments);

    const scheduled = await prisma.scheduledMessage.create({
      data: {
        channelId,
        userId: req.user.id,
        body: sanitize(String(body)).slice(0, 2000),
        scheduledAt: when,
        attachments: normalized.length ? normalized : undefined,
      },
    });

    res.status(201).json({ scheduled: mapScheduled(scheduled) });
  } catch (e) { next(e); }
});

// GET /api/messages/scheduled — all of my scheduled messages (across servers)
scheduledRouter.get('/messages/scheduled', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.scheduledMessage.findMany({
      where: { userId: req.user.id, sent: false },
      include: { channel: { select: { id: true, name: true, serverId: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json({ scheduled: items.map(mapScheduled) });
  } catch (e) { next(e); }
});

// GET /api/channels/:id/scheduled — scheduled messages in a specific channel
scheduledRouter.get('/channels/:id/scheduled', requireAuth, requirePermission('read'), async (req, res, next) => {
  try {
    const items = await prisma.scheduledMessage.findMany({
      where: { channelId: req.params.id, sent: false },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json({ scheduled: items.map(mapScheduled) });
  } catch (e) { next(e); }
});

// DELETE /api/messages/scheduled/:id
scheduledRouter.delete('/messages/scheduled/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const existing = await prisma.scheduledMessage.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Scheduled message not found.');
    if (existing.userId !== req.user.id) throw new HttpError(403, 'You can only cancel your own scheduled messages.');

    await prisma.scheduledMessage.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

function mapScheduled(s) {
  return {
    id: s.id,
    channelId: s.channelId,
    channel: s.channel ? { id: s.channel.id, name: s.channel.name, serverId: s.channel.serverId } : undefined,
    body: s.body,
    attachments: s.attachments || null,
    scheduledAt: s.scheduledAt.toISOString(),
    sent: s.sent,
    createdAt: s.createdAt.toISOString(),
  };
}

// Deliver a single due scheduled message into the channel.
export async function deliverScheduledMessage(s) {
  const message = await prisma.message.create({
    data: {
      channelId: s.channelId,
      userId: s.userId,
      body: s.body,
      attachments: s.attachments || undefined,
    },
    include: {
      author: true,
      reactions: true,
      parentMessage: { include: { author: true, reactions: true } },
    },
  });

  await prisma.scheduledMessage.update({
    where: { id: s.id },
    data: { sent: true },
  });

  const io = getIO();
  emitRealtimeEvent('message:new', s.channelId, { message });
  return message;
}
