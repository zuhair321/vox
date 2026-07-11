// JWT auth middleware.
//
// `requireAuth`  → blocks the request if there's no valid token (401).
// `optionalAuth` → attaches req.user if a token is present, but lets the
//                  request through otherwise. Used by the public chat endpoints
//                  so the existing demo flow keeps working unauthenticated,
//                  while authed users get their real name/color attached.
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';

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

// Extracts the user from the Authorization header (or cookie) WITHOUT
// calling next — the caller decides what to do with req.user.
function loadUser(req) {
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
  } catch {
    req.user = null;
  }
}

export function optionalAuth(req, res, next) {
  loadUser(req);
  return next();
}

export function requireAuth(req, res, next) {
  loadUser(req);
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  return next();
}
