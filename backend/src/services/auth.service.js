// Auth business logic: register, login (with 2FA branching), 2FA setup/verify,
// and the public user shape returned to the client.
//
// FALLBACK MODE: When MySQL is unavailable, we switch to in-memory demo auth
// so users can still register/login and reach the app.
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
  findValidRefreshToken,
  revokeRefreshToken,
  verifyRefresh,
} from './tokens.js';

const { authenticator } = otplib;

// Palette used to assign a deterministic-ish avatar color to new users.
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

// ── In-memory fallback store (when MySQL is unavailable) ──────
let databaseAvailable = true;
const memoryUsers = new Map();
const memoryRefreshTokens = new Set();

// Probe the database with a query that exercises the schema (not just the
// connection) and avoids the BigInt serialization quirk of `$queryRaw SELECT 1`.
// Returns true when the DB is reachable and the tables exist.
function probeDatabase() {
  return prisma.user
    .count()
    .then(() => true)
    .catch(() => false);
}

// Self-healing availability check.
//
// The old code ran `detectDbAvailable()` exactly once at boot. If MySQL wasn't
// ready that instant (common on first run / slow machine), `databaseAvailable`
// got latched to `false` FOREVER for the auth module. Login then minted
// in-memory users with synthetic ids (`demo-<ts>`), and every later message
// send failed the Message.userId foreign key (Prisma P2003) — sends silently
// 500'd.
//
// We now re-probe before each auth operation, and flip back to `true` the moment
// MySQL recovers. A one-shot boot log is kept for diagnostics.
let bootProbeDone = false;
async function checkDatabase() {
  const ok = await probeDatabase();
  if (ok && !databaseAvailable) {
    console.log('[vox/auth] MySQL recovered — resuming DB-backed auth');
  } else if (!ok && databaseAvailable) {
    console.warn('[vox/auth] MySQL unavailable — using in-memory demo auth');
  }
  databaseAvailable = ok;
  return ok;
}

// One initial probe so the boot log reflects reality, without latching state.
probeDatabase().then((ok) => {
  if (!ok) {
    console.warn('[vox/auth] MySQL unavailable at boot — using in-memory demo auth (will retry)');
  }
  databaseAvailable = ok;
  bootProbeDone = true;
});

function memoryCreateUser({ email, username, passwordHash, color, role }) {
  const user = {
    id: `demo-${Date.now()}`,
    email,
    username,
    displayName: username,
    passwordHash,
    color: color || pickColor(username),
    status: 'ONLINE',
    role: role || 'MEMBER',
    twoFactorEnabled: false,
    twoFactorSecret: null,
    createdAt: new Date().toISOString(),
    hasTurbo: true,
    turboSince: new Date().toISOString(),
  };
  memoryUsers.set(username.toLowerCase(), user);
  memoryUsers.set(email.toLowerCase(), user);
  return user;
}

function memoryFindUser(identifier) {
  return memoryUsers.get(identifier.toLowerCase()) || null;
}

async function memoryMintTokenPair(user) {
  const jwt = (await import('jsonwebtoken')).default;
  const crypto = await import('node:crypto');

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

  memoryRefreshTokens.add(refresh);
  return { access, refresh };
}

async function memoryVerifyRefresh(token) {
  const jwt = (await import('jsonwebtoken')).default;
  return jwt.verify(token, env.jwt.refreshSecret);
}

async function memoryFindValidRefreshToken(token) {
  const jwt = (await import('jsonwebtoken')).default;
  if (!memoryRefreshTokens.has(token)) return null;
  try {
    const payload = jwt.verify(token, env.jwt.refreshSecret);
    const user = memoryFindUser(payload.sub);
    if (!user) return null;
    return { user };
  } catch {
    return null;
  }
}

async function memoryRevokeRefreshToken(token) {
  memoryRefreshTokens.delete(token);
}

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

  // Re-probe so a DB that was down at boot (or went down mid-session) is
  // picked up as soon as it's back — no more permanent in-memory latching.
  await checkDatabase();

  if (databaseAvailable) {
    try {
      const exists = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
        select: { id: true },
      });
      if (exists) {
        throw new HttpError(409, 'That email or username is already registered.');
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
    } catch (error) {
      if (error instanceof HttpError) throw error;
      // Prisma unique constraint violation (P2002) means email/username already exists
      // Treat this as a user error, not a DB error
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const rawTarget = error.meta?.target;
        const target = Array.isArray(rawTarget) ? rawTarget.join(', ') : rawTarget || 'field';
        throw new HttpError(409, `That ${target} is already taken.`);
      }
      console.warn('[vox/auth] DB error during register, switching to memory fallback:', error.message);
      databaseAvailable = false;
    }
  }

  // Fallback: in-memory
  if (memoryFindUser(email) || memoryFindUser(username)) {
    throw new HttpError(409, 'That email or username is already registered.');
  }
  const user = memoryCreateUser({
    email,
    username,
    passwordHash: await bcrypt.hash(password, 10),
  });
  const tokens = await memoryMintTokenPair(user);
  return { user: publicUser(user), tokens };
}

// ── Login (branches on 2FA) ──────────────────────────────────
export async function login({ emailOrUsername, password }, deviceContext = {}) {
  const identifier = String(emailOrUsername || '').trim().toLowerCase();
  if (!identifier || !password) {
    throw new HttpError(400, 'Email/username and password are required.');
  }

  // Re-probe so we honor a recovered DB instead of a stale boot decision.
  await checkDatabase();

  if (databaseAvailable) {
    try {
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier }] },
      });

      if (user) {
        // Account lockout check
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          const mins = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
          throw new HttpError(423, `Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
        }

        if (await bcrypt.compare(String(password), user.passwordHash)) {
          // Successful login — reset lockout
          await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
          });

          if (user.twoFactorEnabled) {
            const tempToken = jwtTemp(user, '5m');
            return { twoFactorRequired: true, tempToken };
          }
          const tokens = await mintTokenPair(user, deviceContext.deviceInfo, deviceContext.ipAddress, deviceContext.userAgent);
          return { user: publicUser(user), tokens };
        }

        // Wrong password — increment attempts
        const attempts = (user.loginAttempts || 0) + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // lock 30min after 5 fails
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: attempts,
            ...(lockUntil ? { lockedUntil: lockUntil } : {}),
          },
        });
        if (lockUntil) {
          throw new HttpError(423, 'Account locked due to too many failed attempts. Try again in 30 minutes.');
        }
        throw new HttpError(401, 'Invalid credentials.');
      }
      // User not found in DB — check memory fallback
    } catch (error) {
      if (error instanceof HttpError) throw error;
      console.warn('[vox/auth] DB error during login, switching to memory fallback:', error.message);
      databaseAvailable = false;
    }
  }

  // Fallback: in-memory
  const memUser = memoryFindUser(identifier);
  if (!memUser || !(await bcrypt.compare(String(password), memUser.passwordHash))) {
    throw new HttpError(401, 'Invalid credentials.');
  }
  const tokens = await memoryMintTokenPair(memUser);
  return { user: publicUser(memUser), tokens };
}

// ── 2FA setup ────────────────────────────────────────────────
export async function beginTwoFactorSetup(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found.');

  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: encrypt(secret) },
  });

  const otpauth = authenticator.keyuri(user.username, env.twoFactor.appName, secret);
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
  const ok = authenticator.verify({ token: String(code || '').trim(), secret });
  if (!ok) throw new HttpError(400, 'Invalid 2FA code.');

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
  const ok = authenticator.verify({ token: String(code || '').trim(), secret });
  if (!ok) throw new HttpError(400, 'Invalid 2FA code.');

  const tokens = await mintTokenPair(user);
  return { user: publicUser(user), tokens };
}

// ── Refresh ──────────────────────────────────────────────────
export async function refreshTokens(refreshToken) {
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    // If verifyRefresh fails, try memory verify (same JWT lib, same secret)
    try {
      payload = await memoryVerifyRefresh(refreshToken);
    } catch {
      throw new HttpError(401, 'Invalid refresh token.');
    }
  }

  if (!databaseAvailable) {
    const row = await memoryFindValidRefreshToken(refreshToken);
    if (!row) throw new HttpError(401, 'Refresh token is no longer valid.');
    await memoryRevokeRefreshToken(refreshToken);
    const tokens = await memoryMintTokenPair(row.user);
    return { user: publicUser(row.user), tokens };
  }

  // Re-probe before touching the DB so a recovered MySQL is used, and a
  // freshly-failed one falls through to the memory path below.
  await checkDatabase();
  if (!databaseAvailable) {
    const row = await memoryFindValidRefreshToken(refreshToken);
    if (!row) throw new HttpError(401, 'Refresh token is no longer valid.');
    await memoryRevokeRefreshToken(refreshToken);
    const tokens = await memoryMintTokenPair(row.user);
    return { user: publicUser(row.user), tokens };
  }

  const row = await findValidRefreshToken(refreshToken);
  if (!row) throw new HttpError(401, 'Refresh token is no longer valid.');

  await revokeRefreshToken(refreshToken);
  const tokens = await mintTokenPair(row.user);
  return { user: publicUser(row.user), tokens };
}

export async function logout(refreshToken) {
  if (refreshToken) {
    try { await revokeRefreshToken(refreshToken); } catch { /* ignore */ }
    try { await memoryRevokeRefreshToken(refreshToken); } catch { /* ignore */ }
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

  // Invalidate any previous reset tokens for this user.
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

  // Generate a random token, hash it for storage.
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      // Expires in 15 minutes (createdAt is set by @createdAt)
      // We compare createdAt + 15min at verification time.
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
  if (!reset) throw new HttpError(400, 'Invalid or expired reset token.');

  // Check expiration (15 minutes).
  const elapsed = Date.now() - new Date(reset.expiresAt).getTime();
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

  // Invalidate any previous verification tokens for this user.
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Reuse PasswordReset model — the flow is identical (token + hash + expiry).
  // Distinguish by checking emailVerified at verification time.
  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash },
  });

  await sendVerificationEmail(user.email, token);

  return { ok: true };
}

export async function verifyEmail(token) {
  if (!token) throw new HttpError(400, 'Token is required.');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!reset) throw new HttpError(400, 'Invalid or expired verification token.');

  // Check expiration (24 hours).
  const elapsed = Date.now() - new Date(reset.expiresAt).getTime();
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
import jwt from 'jsonwebtoken';
function jwtTemp(user, ttl) {
  return jwt.sign(
    { twoFactorChallenge: true, username: user.username },
    env.jwt.accessSecret,
    { subject: user.id, expiresIn: ttl },
  );
}
