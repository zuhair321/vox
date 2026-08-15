// Auth business logic: register, login (with 2FA branching), 2FA setup/verify,
// and the public user shape returned to the client.
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import * as otplib from 'otplib';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { env } from '../lib/env.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service.js';
import {
  mintTokenPair,
  mintAccessToken,
  findValidRefreshToken,
  revokeRefreshToken,
  verifyRefresh,
} from './tokens.js';
import jwt from 'jsonwebtoken';
import { cacheSet, cacheGet, cacheInvalidate } from '../lib/redis.js';

// otplib v13 exposes a functional API (generateSecret / generateURI / verify)
// rather than the legacy `authenticator` instance.
const { generateSecret, generateURI, verify: verifyTotp } = otplib;
const AVATAR_COLORS = [
  '#5865f2', '#eb459e', '#3ba55c', '#faa61a',
  '#9b59b6', '#1abc9c', '#e67e22', '#e74c3c',
];

function pickColor(username) {
  let sum = 0;
  for (let i = 0; i < username.length; i++) sum += username.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// The subset of the User we expose over the API (never passwordHash etc.).
export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role || 'MEMBER',
    color: user.color || '#5865f2',
    status: user.status || 'ONLINE',
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    bannerUrl: user.bannerUrl ?? null,
    twoFactorEnabled: !!user.twoFactorEnabled,
    emailVerified: !!user.emailVerified,
    hasTurbo: user.hasTurbo !== undefined ? user.hasTurbo : true,
    turboSince: user.turboSince ?? null,
  };
}

// Decide whether auth cookies get the `; Secure` attribute.
//
// `Secure` cookies are ONLY stored by the browser over HTTPS. The local-first
// desktop app serves the SPA + API over plain http://127.0.0.1:4000, so marking
// the cookies Secure there makes the browser silently drop them — the user
// "logs in" but the next request is unauthenticated ("session expired, please
// log in again"). We therefore only set Secure when the app is actually served
// over HTTPS:
//   • COOKIE_SECURE=1  → force Secure (hosted HTTPS deployments)
//   • COOKIE_SECURE=0  → force off
//   • otherwise: Secure only in production AND when NOT serving the SPA locally
//     over HTTP (SERVE_FRONTEND=1 is the desktop/single-origin HTTP case).
function useSecureCookies() {
  if (process.env.COOKIE_SECURE === '1') return true;
  if (process.env.COOKIE_SECURE === '0') return false;
  const isProd = process.env.NODE_ENV === 'production';
  const localHttp = process.env.SERVE_FRONTEND === '1';
  return isProd && !localHttp;
}


function cookieSameSite() {
  return process.env.COOKIE_SAMESITE_NONE === '1' ? 'none' : 'lax';
}
function setAuthCookies(res, access, refresh) {
  const ss = cookieSameSite();
  const isProd = useSecureCookies() || ss === 'none';
  const ssCap = ss.charAt(0).toUpperCase() + ss.slice(1);
  const secureSuffix = isProd ? '; Secure' : '';
  const now = Math.floor(Date.now() / 1000);
  const accessDecoded = jwt.decode(access);
  const refreshDecoded = jwt.decode(refresh);
  const maxAgeAccess = (accessDecoded && typeof accessDecoded.exp === 'number' ? accessDecoded.exp : now + 900) - now;
  const maxAgeRefresh = (refreshDecoded && typeof refreshDecoded.exp === 'number' ? refreshDecoded.exp : now + 604800) - now;
  res.setHeader('Set-Cookie', [
    `vox_access=${access}; HttpOnly; SameSite=${ssCap}; Path=/; Max-Age=${maxAgeAccess}${secureSuffix}`,
    `vox_refresh=${refresh}; HttpOnly; SameSite=${ssCap}; Path=/; Max-Age=${maxAgeRefresh}${secureSuffix}`,
  ]);
}

function clearAuthCookies(res) {
  const ss = cookieSameSite();
  const isProd = useSecureCookies() || ss === 'none';
  const ssCap = ss.charAt(0).toUpperCase() + ss.slice(1);
  const secureSuffix = isProd ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `vox_access=; HttpOnly; SameSite=${ssCap}; Path=/; Max-Age=0${secureSuffix}`,
    `vox_refresh=; HttpOnly; SameSite=${ssCap}; Path=/; Max-Age=0${secureSuffix}`,
  ]);
}

export { setAuthCookies, clearAuthCookies };

// ── Register ─────────────────────────────────────────────────
export async function register({ email, username, password }, deviceContext = {}) {
  email = String(email || '').trim().toLowerCase();
  username = String(username || '').trim();
  password = String(password || '');

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpError(400, 'Please enter a valid email address.');
  }
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    throw new HttpError(400, 'Username must be 3–32 chars: letters, numbers, underscore.');
  }
  if (password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.');
  }

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (existingEmail && existingUsername) {
    throw new HttpError(409, 'Both this email and username are already registered.');
  }
  if (existingEmail) {
    throw new HttpError(409, 'An account with this email already exists.');
  }
  if (existingUsername) {
    throw new HttpError(409, 'This username is already taken.');
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName: username,
      passwordHash: await bcrypt.hash(password, 10),
      color: pickColor(username),
      role: 'MEMBER',
    },
  });

  const tokens = await mintTokenPair(user, deviceContext.deviceInfo, deviceContext.ipAddress, deviceContext.userAgent);
  return { user: publicUser(user), tokens };
}

// ── Login History & Alerts ───────────────────────────────────
// H3: 2FA context backed by Redis (survives restarts and multi-instance)
const TFA_CONTEXT_KEY = (userId) => `vox:tfa-context:${userId}`;
const TFA_CONTEXT_TTL = 300; // 5 minutes

async function recordLoginHistory(userId, deviceContext) {
  const deviceInfo = deviceContext.deviceInfo || null;
  const ipAddress = deviceContext.ipAddress || null;
  const userAgent = deviceContext.userAgent || null;

  // Check if this is a new login (different device/IP from recent logins)
  let isNewLogin = false;
  let alertMessage = '';
  
  try {
    const recentLogins = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recentLogins.length === 0) {
      isNewLogin = true;
      alertMessage = 'First login to your VOX account.';
    } else {
      const isNewDevice = !recentLogins.some(
        (l) => l.deviceInfo === deviceInfo && l.ipAddress === ipAddress
      );
      if (isNewDevice) {
        isNewLogin = true;
        const location = await resolveLocation(ipAddress);
        alertMessage = `New login detected from ${deviceInfo || 'unknown device'}${location ? ` (${location})` : ''}.`;
      }
    }

    await prisma.loginHistory.create({
      data: {
        userId,
        deviceInfo,
        ipAddress,
        userAgent,
        location: isNewLogin ? alertMessage : null,
        alertSent: isNewLogin,
      },
    });

    // Login alert email on a new device/IP (Moderation + Notifications: mirrors
    // Discord's "new login" email). Best-effort — failures are swallowed.
    if (isNewLogin) {
      try {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, displayName: true } });
        if (u?.email) {
          const { sendEmail } = await import('../services/email.service.js');
          await sendEmail({
            to: u.email,
            subject: 'VOX — New login to your account',
            html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;padding:32px;border-radius:8px;">
              <h1 style="color:#5865f2;">New login to VOX</h1>
              <p>${escapeHtml(alertMessage)}</p>
              <p style="color:#888;font-size:12px;">If this was you, no action is needed. If not, reset your password immediately.</p>
            </div>`,
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    }
  } catch (error) {
    console.warn('[vox/auth] Failed to record login history:', error.message);
  }

  return { isNewLogin, alertMessage: isNewLogin ? alertMessage : null };
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function resolveLocation(ipAddress) {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') return 'localhost';
  // Placeholder: in production, use a GeoIP database or service
  return null;
}

// ── Login (branches on 2FA) ──────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Returns a generic error for both "no account" and "wrong password" so an
// attacker cannot enumerate which emails/usernames are registered.
function throwAuthFailure() {
  throw new HttpError(401, 'Invalid email/username or password.');
}

export async function login({ emailOrUsername, password }, deviceContext = {}) {
  const identifier = String(emailOrUsername || '').trim().toLowerCase();
  if (!identifier || !password) {
    throw new HttpError(400, 'Email/username and password are required.');
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });

  // Enforce an active lockout (manual admin ban or brute-force lock) BEFORE any
  // password work, so a locked account is rejected immediately and uniformly.
  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new HttpError(423, `Account temporarily locked. Try again in ${mins} minute(s).`);
  }

  // Always run a dummy bcrypt compare so timing doesn't reveal account existence.
  const dummyHash =
    '$2a$10$0000000000000000000000000000000000000000000000000000';
  const passwordOk = user
    ? await bcrypt.compare(String(password), user.passwordHash)
    : await bcrypt.compare(String(password), dummyHash);

  if (!user || !passwordOk) {
    if (user) {
      const attempts = (user.loginAttempts || 0) + 1;
      const data = { loginAttempts: attempts };
      // Lock the account once the threshold is reached.
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        data.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      await prisma.user.update({ where: { id: user.id }, data }).catch(() => {});
    }
    throwAuthFailure();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lastLoginAt: new Date() },
  });

  if (user.twoFactorEnabled) {
    const tempToken = jwtTemp(user, '5m');
    // Store device context for use after 2FA completion
    await cacheSet(TFA_CONTEXT_KEY(user.id), JSON.stringify({
      deviceInfo: deviceContext.deviceInfo,
      ipAddress: deviceContext.ipAddress,
      userAgent: deviceContext.userAgent,
    }), TFA_CONTEXT_TTL).catch(() => {});
    return { twoFactorRequired: true, tempToken };
  }

  const tokens = await mintTokenPair(user, deviceContext.deviceInfo, deviceContext.ipAddress, deviceContext.userAgent);

  // Record login history and detect new logins
  const loginAlert = await recordLoginHistory(user.id, deviceContext);

  return { user: publicUser(user), tokens, loginAlert };
}

// ── 2FA setup ────────────────────────────────────────────────
export async function beginTwoFactorSetup(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found.');

  const secret = generateSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: encrypt(secret) },
  });

  const otpauth = generateURI({ secret, label: user.username, issuer: env.twoFactor.appName });
  const { default: QRCode } = await import('qrcode');
  const qr = await QRCode.toDataURL(otpauth);

  return { secret, otpauth, qr };
}

export async function confirmTwoFactorSetup(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) {
    throw new HttpError(400, 'Start 2FA setup first.');
  }

  const secret = decrypt(user.twoFactorSecret);
  const ok = await verifyTotp({ token: String(code || '').trim(), secret });
  if (!ok?.valid) throw new HttpError(400, 'Invalid 2FA code.');

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
  return { enabled: true };
}

// ── 2FA completion of login ──────────────────────────────────
export async function completeTwoFactorLogin(tempToken, code) {
  let payload;
  try {
    payload = jwt.verify(tempToken, env.jwt.accessSecret);
  } catch {
    throw new HttpError(401, '2FA session expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new HttpError(400, '2FA is not enabled for this account.');
  }

  const secret = decrypt(user.twoFactorSecret);
  const ok = await verifyTotp({ token: String(code || '').trim(), secret });
  if (!ok?.valid) throw new HttpError(400, 'Invalid 2FA code.');

  let deviceContext = {};
    try {
      const raw = await cacheGet(TFA_CONTEXT_KEY(user.id));
      if (raw) deviceContext = JSON.parse(raw);
    } catch { /* fallback to empty */ }
  await cacheInvalidate(TFA_CONTEXT_KEY(user.id)).catch(() => {});

  const tokens = await mintTokenPair(user, deviceContext.deviceInfo, deviceContext.ipAddress, deviceContext.userAgent);
  
  // Record login history for 2FA logins
  const loginAlert = await recordLoginHistory(user.id, deviceContext);
  
  return { user: publicUser(user), tokens, loginAlert };
}

// ── Refresh ──────────────────────────────────────────────────
export async function refreshTokens(refreshToken) {
  try {
    verifyRefresh(refreshToken);
  } catch {
    throw new HttpError(401, 'Invalid refresh token.');
  }

  const row = await findValidRefreshToken(refreshToken);
  if (!row) {
    throw new HttpError(401, 'Refresh token is no longer valid.');
  }

  // Deliberately NO rotation on refresh. The same refresh token stays valid
  // for its full lifetime (env.jwt.refreshTtl) and only ever mints new access
  // tokens. Rotating here meant a concurrent refresh (parallel 401s, an upload
  // retry racing the API client) or a lost response after rotation would leave
  // the client holding a just-revoked cookie — forcing a forced logout and
  // "session expired" on the very next request. Tokens rotate at login, logout,
  // and password change instead. The refresh token is HttpOnly so the widened
  // window carries no practical XSS risk.
  const access = mintAccessToken(row.user);
  return { user: publicUser(row.user), tokens: { access, refresh: refreshToken } };
}

export async function logout(refreshToken) {
  if (refreshToken) {
    try { await revokeRefreshToken(refreshToken); } catch { /* ignore */ }
  }
  return { ok: true };
}

// ── Password Reset ────────────────────────────────────────────
export async function requestPasswordReset(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) throw new HttpError(400, 'Email is required.');

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent email enumeration.
  if (!user) return { ok: true };

  // Invalidate any previous reset tokens for this user (RESET type only).
  await prisma.passwordReset.deleteMany({ where: { userId: user.id, type: 'RESET' } });

  // Generate a random token, hash it for storage.
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      type: 'RESET',
    },
  });

  // Send the raw (unhashed) token to the user's email.
  await sendPasswordResetEmail(user.email, token);

  return { ok: true };
}

export async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw new HttpError(400, 'Token and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.');
  }

  // Hash the incoming token to compare with stored hash.
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!reset || reset.type !== 'RESET') throw new HttpError(400, 'Invalid or expired reset token.');

  // Check expiration (15 minutes).
  const elapsed = Date.now() - new Date(reset.createdAt).getTime();
  if (elapsed > 15 * 60 * 1000) {
    await prisma.passwordReset.delete({ where: { id: reset.id } });
    throw new HttpError(400, 'Reset token has expired. Please request a new one.');
  }

  // Update the user's password.
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: reset.userId },
    data: { passwordHash: hashedPassword },
  });

  // Invalidate the token and all existing refresh tokens.
  await prisma.passwordReset.delete({ where: { id: reset.id } });
  await prisma.refreshToken.deleteMany({ where: { userId: reset.userId } });

  return { ok: true };
}

// ── Email Verification ────────────────────────────────────────
export async function requestEmailVerification(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found.');
  if (user.emailVerified) throw new HttpError(400, 'Email is already verified.');

  // Invalidate any previous verification tokens for this user (VERIFY type only).
  await prisma.passwordReset.deleteMany({ where: { userId: user.id, type: 'VERIFY' } });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, type: 'VERIFY' },
  });

  await sendVerificationEmail(user.email, token);

  return { ok: true };
}

export async function verifyEmail(token) {
  if (!token) throw new HttpError(400, 'Token is required.');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!reset || reset.type !== 'VERIFY') throw new HttpError(400, 'Invalid or expired verification token.');

  // Check expiration (24 hours).
  const elapsed = Date.now() - new Date(reset.createdAt).getTime();
  if (elapsed > 24 * 60 * 60 * 1000) {
    await prisma.passwordReset.delete({ where: { id: reset.id } });
    throw new HttpError(400, 'Verification token has expired. Please request a new one.');
  }

  await prisma.user.update({
    where: { id: reset.userId },
    data: { emailVerified: true },
  });

  await prisma.passwordReset.delete({ where: { id: reset.id } });

  return { verified: true };
}

// ── small helper: sign short-lived temp tokens for 2FA flow ──
function jwtTemp(user, ttl) {
  return jwt.sign(
    { twoFactorChallenge: true, username: user.username },
    env.jwt.accessSecret,
    { subject: user.id, expiresIn: ttl },
  );
}
