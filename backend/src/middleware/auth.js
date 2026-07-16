// JWT auth middleware.
//
// `requireAuth`  → blocks the request if there's no valid token (401).
// `optionalAuth` → attaches req.user if a token is present, but lets the
//                  request through otherwise. Used by the public chat endpoints
//                  so the existing demo flow keeps working unauthenticated,
//                  while authed users get their real name/color attached.
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  // Also accept token via cookie (set during login response) for convenience.
  if (req.cookies && req.cookies.vox_access) {
    return req.cookies.vox_access;
  }
  return null;
}

// Resolve a user from a personal API key of the form `vox_<prefix>_<secret>`.
// Returns { id, username, role } or null. Updates lastUsed on success.
async function loadUserFromApiKey(token) {
  if (!token.startsWith('vox_')) return null;
  const keyHash = createHash('sha256').update(token).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) return null;

  const user = await prisma.user.findUnique({ where: { id: apiKey.userId } });
  if (!user) return null;

  // Fire-and-forget lastUsed stamp (non-blocking).
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});

  return { id: user.id, username: user.username, role: user.role };
}

// Extracts the user from the Authorization header (or cookie) WITHOUT
// calling next — the caller decides what to do with req.user.
async function loadUser(req) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    // Reject 2FA challenge temp tokens — they should NOT grant API access.
    // These are short-lived tokens issued during the 2FA login flow and must
    // only be accepted by the dedicated /2fa/login endpoint.
    if (payload.twoFactorChallenge) {
      req.user = null;
      return;
    }
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    return;
  } catch {
    // Not a JWT (or expired) — fall through to API-key auth below.
  }

  // API-key authentication (e.g. bots / integrations using Bearer vox_...).
  if (token.startsWith('vox_')) {
    try {
      req.user = await loadUserFromApiKey(token);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
}

export async function optionalAuth(req, res, next) {
  await loadUser(req);
  return next();
}

export async function requireAuth(req, res, next) {
  await loadUser(req);
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  return next();
}
