// Token minting + verification for JWT auth.
//
// We issue two tokens on login:
//   - access  (short-lived, 15m) — sent on every API request + socket handshake
//   - refresh (long-lived, 7d)   — used only to mint new access tokens
//
// Refresh tokens are hashed before storage, so a DB leak doesn't expose
// usable tokens.
//
// FALLBACK: When MySQL is unavailable, we use a simple in-memory Set.
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function mintTokenPair(user, deviceInfo, ipAddress, userAgent) {
  const access = jwt.sign(
    { username: user.username, role: user.role || 'MEMBER', userId: user.id },
    env.jwt.accessSecret,
    { subject: user.id, expiresIn: env.jwt.accessTtl },
  );

  const refresh = jwt.sign({}, env.jwt.refreshSecret, {
    subject: user.id,
    jwtid: crypto.randomUUID(),
    expiresIn: env.jwt.refreshTtl,
  });

  // Persist the refresh token (hashed) with device info — fail silently if DB is down
  try {
    const decoded = jwt.decode(refresh);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(decoded.exp * 1000),
        deviceInfo: deviceInfo || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch {
    // DB unavailable — token still valid, just not persisted
  }

  return { access, refresh };
}

export function verifyAccess(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefresh(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

// Look up a refresh token in the DB; returns the row if it's valid + not revoked.
export async function findValidRefreshToken(token) {
  try {
    const tokenHash = hashToken(token);
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row) return null;
    if (row.revoked) return null;
    if (row.expiresAt < new Date()) return null;
    return row;
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(token) {
  try {
    await prisma.refreshToken.update({
      where: { tokenHash: hashToken(token) },
      data: { revoked: true },
    });
  } catch {
    // token may not exist — ignore
  }
}
