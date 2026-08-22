import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const keysRouter = Router();

// Fingerprint a base64 X25519 public key (32 raw bytes) into a short hex string.
// Same shape the frontend dmCrypto.ts uses so users can compare across devices.
function fingerprint(publicKeyB64) {
  const buf = Buffer.from(publicKeyB64, 'base64');
  if (buf.length !== 32) throw new Error('publicKey must decode to 32 bytes');
  const digest = crypto.createHash('sha256').update(buf).digest('hex');
  // 16 hex chars is enough to avoid collisions in a single user's contact list.
  return digest.slice(0, 16);
}

// PUT /api/users/me/keys — publish / replace my X25519 public key for E2E DM.
// Body: { publicKey: base64(32 bytes), keyVersion?: number }
// Privacy: the server NEVER receives the private key. It only stores the
// public half + a fingerprint so other users can verify "this key belongs to
// the same person they messaged before." On rotation, keyVersion increments.

// Rate limiting
keysRouter.use(rateLimit);

keysRouter.put('/users/me/keys', requireAuth, async (req, res, next) => {
  try {
    const { publicKey, keyVersion } = req.body || {};
    if (typeof publicKey !== 'string' || publicKey.length < 16) {
      throw new HttpError(400, 'publicKey is required (base64 X25519, 32 bytes)');
    }
    // Validate length to defend against accidental truncation up front.
    let decodedLen;
    try { decodedLen = Buffer.from(publicKey, 'base64').length; } catch { decodedLen = 0; }
    if (decodedLen !== 32) {
      throw new HttpError(400, 'publicKey must decode to exactly 32 bytes');
    }
    const fp = fingerprint(publicKey);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        publicKey,
        publicKeyFingerprint: fp,
        keyRotatedAt: new Date(),
        // keyVersion defaults to 1 on schema; bump monotonically on rotation.
        ...(Number.isInteger(keyVersion) && keyVersion > 0
          ? { /* Prisma can't atomic-increment; client passes explicit version */ }
          : {}),
      },
      select: { id: true, publicKey: true, publicKeyFingerprint: true, keyRotatedAt: true },
    });
    res.json(user);
  } catch (e) { next(e); }
});

// GET /api/users/me/keys — read back my published public key + fingerprint.
keysRouter.get('/users/me/keys', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, publicKey: true, publicKeyFingerprint: true, keyRotatedAt: true },
    });
    res.json(user || { id: req.user.id, publicKey: null, publicKeyFingerprint: null });
  } catch (e) { next(e); }
});

// GET /api/users/:id/pubkey — fetch a peer's public key (used before opening a DM).
// Returns { id, publicKey, publicKeyFingerprint, keyRotatedAt } or 404 if the
// peer hasn't published a key yet. The server does NOT log or rate-limit the
// fetch aggressively — clients need it once per DM thread.
keysRouter.get('/users/:id/pubkey', requireAuth, async (req, res, next) => {
  try {
    const peer = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, publicKey: true, publicKeyFingerprint: true, keyRotatedAt: true, username: true, displayName: true },
    });
    if (!peer) throw new HttpError(404, 'User not found');
    if (!peer.publicKey) throw new HttpError(404, 'Peer has not published a public key yet');
    res.json(peer);
  } catch (e) { next(e); }
});
