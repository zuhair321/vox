// Personal API keys for third-party integrations.
//   POST   /api/users/me/api-keys          → create an API key
//   GET    /api/users/me/api-keys          → list my API keys
//   DELETE /api/users/me/api-keys/:id      → revoke a key
//
// Keys are shown in full exactly once at creation time. We store only a SHA-256
// hash + a short prefix for display. Requests may authenticate with
// `Authorization: Bearer vox_<prefix>_<secret>` (see middleware/auth.js).
import { Router } from 'express';
import crypto from 'node:crypto';
import { createHash } from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const apiKeysRouter = Router();

const VALID_SCOPES = ['read', 'write', 'admin'];

function generateKey() {
  const prefix = crypto.randomBytes(4).toString('hex'); // 8 chars, shown in UI
  const secret = crypto.randomBytes(24).toString('base64url');
  const raw = `vox_${prefix}_${secret}`;
  const keyHash = createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, keyHash };
}

// POST /api/users/me/api-keys

// Rate limiting
apiKeysRouter.use(rateLimit);

apiKeysRouter.post('/users/me/api-keys', requireAuth, async (req, res, next) => {
  try {
    const { name, scopes, expiresAt } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, 'Key name is required.');

    let scopeList = ['*'];
    if (Array.isArray(scopes) && scopes.length > 0) {
      const clean = scopes.filter((s) => VALID_SCOPES.includes(s));
      if (clean.length === 0) throw new HttpError(400, 'Invalid scopes.');
      scopeList = clean;
    }

    let expires = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (isNaN(parsed.getTime())) throw new HttpError(400, 'Invalid expiry date.');
      if (parsed.getTime() <= Date.now()) throw new HttpError(400, 'Expiry must be in the future.');
      expires = parsed;
    }

    const { raw, prefix, keyHash } = generateKey();

    const key = await prisma.apiKey.create({
      data: {
        userId: req.user.id,
        name: sanitize(String(name)).slice(0, 100),
        keyHash,
        keyPrefix: prefix,
        scopes: scopeList.join(','),
        expiresAt: expires,
      },
    });

    // Return the full raw key exactly once.
    res.status(201).json({
      key: {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes.split(','),
        expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
        createdAt: key.createdAt.toISOString(),
        token: raw,
      },
    });
  } catch (e) { next(e); }
});

// GET /api/users/me/api-keys
apiKeysRouter.get('/users/me/api-keys', requireAuth, async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ keys: keys.map(mapKey) });
  } catch (e) { next(e); }
});

// DELETE /api/users/me/api-keys/:id
apiKeysRouter.delete('/users/me/api-keys/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'API key not found.');
    if (existing.userId !== req.user.id) throw new HttpError(403, 'You can only revoke your own API keys.');

    await prisma.apiKey.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

function mapKey(k) {
  return {
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    scopes: k.scopes.split(','),
    lastUsed: k.lastUsed ? k.lastUsed.toISOString() : null,
    expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  };
}
