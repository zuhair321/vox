// Upload routes: /api/upload/*
//
// Handles animated/static image uploads for user avatars and banners, plus
// chat attachments (images, videos, and files). Files are written to
// backend/uploads/ and served via the /uploads static route registered in
// server.js.
//
// Security: requireAuth gates every endpoint. Avatar/banner uploads keep a
// strict image-only MIME whitelist with a 5MB cap. Chat uploads accept a
// broader set (images + videos + common documents) up to a higher cap.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import * as auth from '../services/auth.service.js';
import { STORAGE_MODE, presignPutUrl, getPublicUrl } from '../lib/storage.js';

// Rate limit uploads to prevent abuse.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads. Please wait a moment.' },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
// Make sure the uploads directory exists at boot.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── MIME allowlists ──────────────────────────────────────────
// Avatar/banner: images only.
const IMAGE_MIME = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const IMAGE_MIME_TO_EXT = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Chat: images + videos + common documents. Anything else is rejected.
const VIDEO_MIME_TO_EXT = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
};
const FILE_MIME_TO_EXT = {
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
};

// Audio (for the soundboard).
const AUDIO_MIME_TO_EXT = {
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
};

// Build a single chat allowlist set for the fileFilter.
const CHAT_MIME = new Set([
  ...Object.keys(IMAGE_MIME_TO_EXT),
  ...Object.keys(VIDEO_MIME_TO_EXT),
  ...Object.keys(FILE_MIME_TO_EXT),
  ...Object.keys(AUDIO_MIME_TO_EXT),
]);

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — avatars/banners
const CHAT_MAX_BYTES = 100 * 1024 * 1024; // 100 MB — chat attachments

// Map a chat MIME type to a coarse kind the frontend renders by, plus its
// file extension for the saved filename.
function chatMimeInfo(mimetype) {
  if (IMAGE_MIME_TO_EXT[mimetype]) return { kind: 'image', ext: IMAGE_MIME_TO_EXT[mimetype] };
  if (VIDEO_MIME_TO_EXT[mimetype]) return { kind: 'video', ext: VIDEO_MIME_TO_EXT[mimetype] };
  if (AUDIO_MIME_TO_EXT[mimetype]) return { kind: 'audio', ext: AUDIO_MIME_TO_EXT[mimetype] };
  if (FILE_MIME_TO_EXT[mimetype]) return { kind: 'file', ext: FILE_MIME_TO_EXT[mimetype] };
  return null; // rejected upstream by the allowlist
}

// Pull a sane extension from the original filename when the MIME type can't
// give us one (e.g. application/octet-stream). Lowercased, no dots.
function extFromName(originalname) {
  const match = String(originalname || '').match(/\.([A-Za-z0-9]{1,8})$/);
  return match ? match[1].toLowerCase() : 'bin';
}

// Keep a malicious/odd filename from sneaking path separators or traversal in.
// Returns something safe to store AND show back to the user.
function sanitizeName(originalname) {
  const base = String(originalname || 'file')
    .replace(/[\\/:*?"<>|]+/g, '_') // strip path separators + Windows-banned chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return base || 'file';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const kind = req.params.kind;

    if (kind === 'chat') {
      const info = chatMimeInfo(file.mimetype);
      if (!info) return cb(new HttpError(400, 'Unsupported file type.'));
      // chat-<userId>-<timestamp>.<ext>  — unique, so concurrent uploads
      // (or a re-upload after switching files) never collide.
      return cb(null, `${kind}-${req.user.id}-${Date.now()}.${info.ext}`);
    }

    // avatar / banner — image only.
    const ext = IMAGE_MIME_TO_EXT[file.mimetype];
    if (!ext) return cb(new HttpError(400, 'Unsupported file type.'));
    cb(null, `${kind}-${req.user.id}-${Date.now()}.${ext}`);
  },
});

// Two preconfigured multer instances. The previous design used one shared
// instance and mutated `upload.limits` per request, which is BOTH a race (the
// limit is process-global, so concurrent uploads of different kinds clobber
// each other) AND ineffective (multer reads `limits` when the middleware runs,
// not when the property is reassigned). Splitting by kind makes the size cap
// and MIME filter deterministic per route.
const imageUpload = multer({
  storage,
  limits: { fileSize: IMAGE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME.has(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, 'Only GIF, JPEG, PNG, and WebP images are allowed.'));
  },
});

const chatUpload = multer({
  storage,
  limits: { fileSize: CHAT_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (CHAT_MIME.has(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, 'File type not allowed in chat.'));
  },
});

export const uploadRouter = Router();

// Roadmap Month 1: presigned PUT so clients can upload directly to S3/R2
// without the backend ever touching the bytes. Discord's path: client asks
// for a PUT URL, pushes the file, then sends the S3 key as the attachment.
uploadRouter.get('/presign/:kind', requireAuth, async (req, res, next) => {
  try {
    const kind = req.params.kind;
    if (!['avatar', 'banner', 'chat', 'server-icon', 'server-banner', 'sound', 'voice-message'].includes(kind)) {
      return next(new HttpError(400, 'Invalid upload kind.'));
    }
    if (STORAGE_MODE !== 's3') {
      return next(new HttpError(501, 'Direct uploads require S3/R2 to be configured.'));
    }

    const filename = String(req.query.filename || `${kind}-${req.user.id}-${Date.now()}`).slice(0, 120);
    const contentType = String(req.query.contentType || 'application/octet-stream');

    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const key = `${kind}/${req.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const url = presignPutUrl(key, contentType, 900);
    if (!url) return next(new HttpError(500, 'Failed to generate presigned URL.'));

    res.json({ url, key, publicUrl: getPublicUrl(key) });
  } catch (e) { next(e); }
});

// Single image upload helper shared by avatar/banner. <kind> is the literal
// filename prefix AND the Prisma field name to update (avatarUrl / bannerUrl).
async function handleUpload(req, res, next) {
  try {
    if (!req.file) throw new HttpError(400, 'No file received.');
    const kind = req.params.kind;
    const publicUrl = STORAGE_MODE === 's3'
      ? getPublicUrl(req.file.filename)
      : `/uploads/${req.file.filename}`;

    if (kind === 'chat' || kind === 'sound' || kind === 'voice-message') {
      const info = chatMimeInfo(req.file.mimetype);
      return res.json({
        url: publicUrl,
        kind: info?.kind ?? 'file',
        name: sanitizeName(req.file.originalname),
        size: req.file.size,
        mime: req.file.mimetype,
      });
    }

    if (kind === 'server-icon') {
      const serverId = String(req.body?.serverId || '').trim();
      if (!serverId) throw new HttpError(400, 'serverId is required.');

      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: req.user.id } },
      });
      if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
        throw new HttpError(403, 'Only admins may update the server icon.');
      }

      const server = await prisma.server.update({
        where: { id: serverId },
        data: { icon: publicUrl },
        include: { channels: true, members: { include: { user: true } } },
      });
      return res.json({ server });
    }

    if (kind === 'server-banner') {
      const serverId = String(req.body?.serverId || '').trim();
      if (!serverId) throw new HttpError(400, 'serverId is required.');

      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: req.user.id } },
      });
      if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
        throw new HttpError(403, 'Only admins may update the server banner.');
      }

      const server = await prisma.server.update({
        where: { id: serverId },
        data: { banner: publicUrl },
        include: { channels: true, members: { include: { user: true } } },
      });
      return res.json({ server });
    }

    const fieldKey = `${kind}Url`; // avatarUrl | bannerUrl
    // Try the DB; if it's unavailable we still return success (demo mode) so
    // the local-only flow keeps working — the upload just isn't persisted.
    try {
      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: { [fieldKey]: publicUrl },
      });
      return res.json({ user: auth.publicUser(updated) });
    } catch (dbErr) {
      console.warn('[upload] DB unavailable, file saved but not persisted:', dbErr.message);
      return res.json({ user: { ...req.user, [fieldKey]: publicUrl } });
    }
  } catch (e) { next(e); }
}

// :kind is validated against {avatar, banner, chat} so a crafted URL can't write
// arbitrary fields. multer.single('file') matches the FormData field name.
uploadRouter.post(
  '/upload/:kind',
  requireAuth,
  uploadLimiter,
  (req, res, next) => {
    const kind = req.params.kind;
    if (!['avatar', 'banner', 'chat', 'server-icon', 'server-banner', 'sound', 'voice-message'].includes(kind)) {
      return next(new HttpError(400, 'Invalid upload kind.'));
    }
    // Dispatch to the multer instance whose size cap + MIME filter matches the
    // kind. avatar/banner → strict image rules + 5MB; chat/sound/
    // voice-message → broader set + 100MB.
    const handler = (kind === 'chat' || kind === 'sound' || kind === 'voice-message')
      ? chatUpload.single('file')
      : imageUpload.single('file');
    return handler(req, res, next);
  },
  handleUpload,
);
