import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { getIO } from '../sockets/index.js';

export const dmRouter = Router();

// Defensive attachment coercion — mirrors the channel-message path.
const ALLOWED_ATTACHMENT_KINDS = new Set(['image', 'video', 'file']);
function normalizeAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      url: String(a.url || '').slice(0, 1024),
      kind: ALLOWED_ATTACHMENT_KINDS.has(a.kind) ? a.kind : 'file',
      name: String(a.name || 'file').slice(0, 200),
      size: Number.isFinite(Number(a.size)) ? Number(a.size) : 0,
      mime: String(a.mime || '').slice(0, 200),
    }))
    .filter((a) => a.url)
    .slice(0, 10);
}

// Fetch DM history
dmRouter.get('/dm/:dmId/messages', requireAuth, async (req, res, next) => {
  try {
    const dmId = req.params.dmId;
    // Verify the user is part of this DM (dmId is userId1_userId2). Split on
    // '_' rather than a substring check so an id that is a substring of the
    // other participant's id can't grant access.
    if (!dmId.split('_').includes(req.user.id)) throw new HttpError(403, 'Not authorized');

    const messages = await prisma.dMMessage.findMany({
      where: { dmId },
      include: {
        sender: true,
        recipient: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    // Return them in chronological order
    res.json(messages.reverse());
  } catch (e) { next(e); }
});

// Send a DM (HTTP fallback)
dmRouter.post('/dm/:dmId/messages', requireAuth, async (req, res, next) => {
  try {
    const dmId = req.params.dmId;
    const { content } = req.body;
    const attachments = normalizeAttachments(req.body?.attachments);

    if (!dmId.split('_').includes(req.user.id)) throw new HttpError(403, 'Not authorized');
    if (!content && attachments.length === 0) throw new HttpError(400, 'Content or attachment is required');

    // dmId is the two participant ids joined by '_' (sorted). Recover the
    // recipient by dropping our own id from the parts — robust even if an id
    // happens to be a substring of the other (the old .replace() approach
    // corrupted ids in that case).
    const recipientId = dmId.split('_').find((part) => part && part !== req.user.id);
    if (!recipientId) throw new HttpError(400, 'Invalid DM channel.');

    const message = await prisma.dMMessage.create({
      data: {
        content: String(content || ''),
        attachments: attachments.length ? attachments : undefined,
        dmId,
        senderId: req.user.id,
        recipientId
      },
      include: {
        sender: true,
        recipient: true
      }
    });

    // Mirror the socket path: deliver to both participants' personal rooms so
    // an HTTP-sent DM still shows up live for the recipient and the sender.
    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('dm:new', { message });
      io.to(`user:${req.user.id}`).emit('dm:new', { message });
    }

    res.status(201).json({ message });
  } catch (e) { next(e); }
});
