import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const emojiRouter = Router();

async function requireAdmin(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Not authorized');
  }
}

// GET /api/servers/:id/emojis
emojiRouter.get('/servers/:id/emojis', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member) throw new HttpError(403, 'Not a member of this server');

    const emojis = await prisma.customEmoji.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ emojis });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/emojis
emojiRouter.post('/servers/:id/emojis', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { name, url } = req.body || {};

    if (!name || typeof name !== 'string') throw new HttpError(400, 'name is required');
    if (!url || typeof url !== 'string') throw new HttpError(400, 'url is required');
    if (!/^https?:\/\//i.test(url.trim())) throw new HttpError(400, 'Emoji URL must start with http:// or https://.');

    await requireAdmin(serverId, req.user.id);

    const emoji = await prisma.customEmoji.create({
      data: {
        serverId,
        name: name.trim().toLowerCase(),
        url: url.trim(),
      },
    });

    res.status(201).json({ emoji });
  } catch (e) { next(e); }
});

// DELETE /api/servers/:id/emojis/:emojiId
emojiRouter.delete('/servers/:id/emojis/:emojiId', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const emojiId = req.params.emojiId;

    await requireAdmin(serverId, req.user.id);

    const emoji = await prisma.customEmoji.findUnique({
      where: { id: emojiId },
    });
    if (!emoji || emoji.serverId !== serverId) throw new HttpError(404, 'Emoji not found');

    await prisma.customEmoji.delete({ where: { id: emojiId } });

    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// Multipart upload (admin/founder). Accepts image/webp (animated), image/gif
// (animated), image/png, image/jpeg. Persists to uploads/emojis/<serverId>/.
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 256 * 1024 } });

emojiRouter.post('/servers/:id/emojis/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const serverId = req.params.id;
    await requireAdmin(serverId, req.user.id);

    const file = req.file;
    if (!file) throw new HttpError(400, 'file field is required (multipart/form-data).');
    const mime = (file.mimetype || '').toLowerCase();
    const allowed = ['image/webp', 'image/gif', 'image/png', 'image/jpeg'];
    if (!allowed.includes(mime)) {
      throw new HttpError(415, 'Only image/webp, image/gif, image/png, image/jpeg are allowed.');
    }
    const isAnimated = mime === 'image/webp' || mime === 'image/gif';
    const name = String(req.body && req.body.name || '').trim().toLowerCase();
    if (!name || !/^[a-z0-9_-]{2,32}$/.test(name)) {
      throw new HttpError(400, 'name must match [a-z0-9_-] and be 2-32 chars.');
    }

    const existing = await prisma.customEmoji.findFirst({ where: { serverId, name } });
    if (existing) throw new HttpError(409, 'An emoji with that name already exists.');

    const ext = mime === 'image/webp' ? 'webp'
              : mime === 'image/gif'  ? 'gif'
              : mime === 'image/png'  ? 'png' : 'jpg';
    const dir = path.resolve('uploads', 'emojis', serverId);
    await fs.mkdir(dir, { recursive: true });
    const filename = name + '-' + crypto.randomBytes(4).toString('hex') + '.' + ext;
    const target = path.join(dir, filename);
    await fs.writeFile(target, file.buffer);

    const baseUrl = process.env.PUBLIC_BASE_URL || ('http://127.0.0.1:' + (process.env.PORT || 4000));
    const url = baseUrl + '/static/emojis/' + serverId + '/' + filename;

    const emoji = await prisma.customEmoji.create({
      data: { serverId, name, url, animated: isAnimated },
    });
    res.status(201).json({ emoji });
  } catch (e) { next(e); }
});
