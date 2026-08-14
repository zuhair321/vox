// Auth routes: /api/auth/*
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';
import * as auth from '../services/auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../services/auth.service.js';

export const authRouter = Router();

// Never return JWTs to the renderer. Tokens are delivered only as HttpOnly
// cookies; this keeps access and refresh credentials out of JavaScript.
function sessionPayload(result) {
  const payload = { user: result.user };
  if (result.loginAlert) payload.loginAlert = result.loginAlert;
  if (result.twoFactorRequired) {
    payload.twoFactorRequired = true;
    payload.tempToken = result.tempToken;
  }
  return payload;
}

// Throttle login/register to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

// Stricter limiter for refresh and password-reset endpoints.
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' },
});

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

const codeSchema = z.object({ code: z.string().min(4).max(8) });

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'Invalid input.', result.error.flatten());
  }
  return result.data;
}

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = parse(registerSchema, req.body);
    const deviceInfo = req.headers['user-agent'] || null;
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '').split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || null;
    const result = await auth.register(data, { deviceInfo, ipAddress, userAgent });
    setAuthCookies(res, result.tokens.access, result.tokens.refresh);
    res.status(201).json(sessionPayload(result));
  } catch (e) { next(e); }
});

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = parse(loginSchema, req.body);
    const deviceInfo = req.headers['user-agent'] || null;
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '').split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || null;
    const result = await auth.login(data, { deviceInfo, ipAddress, userAgent });
    if (result.twoFactorRequired) {
      return res.json(sessionPayload(result));
    }
    setAuthCookies(res, result.tokens.access, result.tokens.refresh);
    res.json(sessionPayload(result));
  } catch (e) { next(e); }
});

authRouter.post('/2fa/login', authLimiter, async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) throw new HttpError(400, 'tempToken and code are required.');
    const result = await auth.completeTwoFactorLogin(tempToken, code);
    setAuthCookies(res, result.tokens.access, result.tokens.refresh);
    res.json(sessionPayload(result));
  } catch (e) { next(e); }
});

authRouter.post('/refresh', sensitiveLimiter, async (req, res, next) => {
  try {
    // F1 (privacy): refresh comes from the HttpOnly cookie ONLY.
    // The previous body-fallback exposed the refresh token to renderer JS,
    // which compromised the entire XSS-resistance of HttpOnly cookies.
    const refreshToken = req.cookies?.vox_refresh;
    if (!refreshToken) throw new HttpError(401, 'Session expired. Please sign in again.');
    const result = await auth.refreshTokens(refreshToken);
    setAuthCookies(res, result.tokens.access, result.tokens.refresh);
    res.json(sessionPayload(result));
  } catch (e) { next(e); }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    // F1 (privacy): the refresh token is in the cookie, never the body.
    await auth.logout(req.cookies?.vox_refresh);
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Current user info (authed) ────────────────────────────────
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: auth.publicUser(user) });
  } catch (e) {
    // Surface DB failures instead of fabricating a fake user.
    return next(e);
  }
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(32).optional(),
  bio: z.string().max(255).nullable().optional(),
  status: z.enum(['ONLINE', 'IDLE', 'DND', 'OFFLINE']).optional(),
});

// F3 (privacy): per-user X25519 public key exchange for DMs.
// PUT /api/auth/me/keys writes the CALLER's publicKey + fingerprint + rotates keyVersion.
// GET /api/auth/users/:id/pubkey returns a peer's public key + fingerprint.
authRouter.put('/me/keys', requireAuth, async (req, res, next) => {
  try {
    const publicKey = String(req.body?.publicKey || '').trim();
    const fingerprint = String(req.body?.publicKeyFingerprint || '').trim();
    if (!publicKey || publicKey.length < 16 || publicKey.length > 4096)
      throw new HttpError(400, 'publicKey is required (16-4096 chars).');
    if (!fingerprint || fingerprint.length !== 64)
      throw new HttpError(400, 'publicKeyFingerprint must be 64-hex SHA-256.');
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { publicKey, publicKeyFingerprint: fingerprint, keyRotatedAt: new Date() },
      select: { id: true, publicKey: true, publicKeyFingerprint: true, keyRotatedAt: true },
    });
    res.json({ ok: true, keys: updated });
  } catch (e) { next(e); }
});

authRouter.get('/users/:id/pubkey', requireAuth, async (req, res, next) => {
  try {
    const peer = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, publicKey: true, publicKeyFingerprint: true, keyRotatedAt: true },
    });
    if (!peer) throw new HttpError(404, 'User not found.');
    res.json({ peer });
  } catch (e) { next(e); }
});

authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const data = parse(updateProfileSchema, req.body);
    // Sanitize user-generated text fields before storing.
    const cleanData = {};
    if (data.displayName) cleanData.displayName = sanitize(data.displayName);
    if (data.bio !== undefined) cleanData.bio = data.bio ? sanitize(data.bio) : null;
    if (data.status) cleanData.status = data.status;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: cleanData,
    });
    // Inform sockets if status changed
    if (data.status) {
      import('../sockets/index.js').then(({ emitAll }) => {
        emitAll('member:status', { userId: user.id, status: user.status });
      });
    }
    return res.json({ user: auth.publicUser(user) });
  } catch (e) { return next(e); }
});

// Voice settings (quality / region / device toggles). Persisted on the user so
// a client can restore a user's preferred calling configuration on any device.
const VOICE_SETTINGS_KEYS = ['quality', 'region', 'noiseSuppression', 'echoCancellation', 'autoGain', 'videoQuality'];
authRouter.get('/users/me/voice-settings', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { voiceSettings: true } });
    res.json({ voiceSettings: user?.voiceSettings || {} });
  } catch (e) {
    next(e);
  }
});

// Profile customization (themes / avatar frames / animated avatar).
const ALLOWED_THEMES = ['midnight', 'sunset', 'aurora', 'mono', 'candy', 'ocean', 'forest', 'galaxy'];
const ALLOWED_FRAMES = ['none', 'ring', 'glow', 'pixel', 'gold', 'neon', 'heart', 'star'];

authRouter.get('/customization/themes', requireAuth, async (req, res) => {
  res.json({
    themes: ALLOWED_THEMES.map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) })),
    frames: ALLOWED_FRAMES.map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) })),
  });
});

authRouter.put('/users/me/profile-customization', requireAuth, async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const data = {};
    if (typeof body.profileTheme === 'string') {
      data.profileTheme = ALLOWED_THEMES.includes(body.profileTheme) ? body.profileTheme : null;
    }
    if (typeof body.avatarFrame === 'string') {
      data.avatarFrame = ALLOWED_FRAMES.includes(body.avatarFrame) ? body.avatarFrame : null;
    }
    if (typeof body.animatedAvatar === 'boolean') data.animatedAvatar = body.animatedAvatar;
    if (Object.keys(data).length === 0) return res.json({ ok: false, error: 'Nothing to update' });
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: { profileTheme: true, avatarFrame: true, animatedAvatar: true } });
    res.json({ profileTheme: user.profileTheme, avatarFrame: user.avatarFrame, animatedAvatar: user.animatedAvatar });
  } catch (e) { next(e); }
});

authRouter.post('/2fa/setup', requireAuth, async (req, res, next) => {
  try {
    const result = await auth.beginTwoFactorSetup(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.post('/2fa/verify', requireAuth, async (req, res, next) => {
  try {
    const { code } = parse(codeSchema, req.body);
    const result = await auth.confirmTwoFactorSetup(req.user.id, code);
    res.json(result);
  } catch (e) { next(e); }
});

// ── Password Reset ─────────────────────────────────────────────
authRouter.post('/forgot-password', sensitiveLimiter, async (req, res, next) => {
  try {
    const { email } = parse(
      z.object({ email: z.string().email() }),
      req.body,
    );
    await auth.requestPasswordReset(email);
    // Always return success to prevent email enumeration.
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
});

authRouter.post('/reset-password', sensitiveLimiter, async (req, res, next) => {
  try {
    const { token, password } = parse(resetPasswordSchema, req.body);
    await auth.resetPassword(token, password);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Change password (logged in) ──────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new HttpError(404, 'User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(401, 'Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Delete own account ─────────────────────────────────────────
authRouter.delete('/me', requireAuth, async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// ── Email Verification ────────────────────────────────────────
authRouter.post('/verify-email/request', requireAuth, sensitiveLimiter, async (req, res, next) => {
  try {
    await auth.requestEmailVerification(req.user.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = parse(z.object({ token: z.string().min(1) }), req.body);
    const result = await auth.verifyEmail(token);
    res.json(result);
  } catch (e) { next(e); }
});

// ── Session Management ────────────────────────────────────────
// GET /api/auth/sessions — list active sessions for current user
authRouter.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId: req.user.id,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ sessions });
  } catch (e) { next(e); }
});

// DELETE /api/auth/sessions/:sessionId — revoke specific session
authRouter.delete('/sessions/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id) return res.status(403).json({ error: 'Not your session' });
    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revoked: true },
    });
    res.json({ revoked: true });
  } catch (e) { next(e); }
});

// DELETE /api/auth/sessions — revoke all sessions except current
authRouter.delete('/sessions', requireAuth, async (req, res, next) => {
  try {
    const currentToken = req.body?.refreshToken;
    const currentHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex')
      : null;

    await prisma.refreshToken.updateMany({
      where: {
        userId: req.user.id,
        ...(currentHash ? { tokenHash: { not: currentHash } } : {}),
        revoked: false,
      },
      data: { revoked: true },
    });
    res.json({ revoked: true });
  } catch (e) { next(e); }
});

// ── Login History ────────────────────────────────────────────
// GET /api/auth/login-history — list recent login events for current user
authRouter.get('/login-history', requireAuth, async (req, res, next) => {
  try {
    const history = await prisma.loginHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        location: true,
        alertSent: true,
        createdAt: true,
      },
    });
    res.json({ history });
  } catch (e) { next(e); }
});

// DELETE /api/auth/login-history/:id — delete a login history entry
authRouter.delete('/login-history/:id', requireAuth, async (req, res, next) => {
  try {
    const entry = await prisma.loginHistory.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.userId !== req.user.id) {
      return res.status(404).json({ error: 'Login history entry not found' });
    }
    await prisma.loginHistory.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// DELETE /api/auth/login-history — clear all login history for current user
authRouter.delete('/login-history', requireAuth, async (req, res, next) => {
  try {
    await prisma.loginHistory.deleteMany({ where: { userId: req.user.id } });
    res.json({ cleared: true });
  } catch (e) { next(e); }
});

// ── Data Export (GDPR) ───────────────────────────────────────
authRouter.get('/export', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        serverMembers: { include: { server: true } },
        friends: true,
        dmsSent: { select: { id: true, recipientId: true, content: true, createdAt: true } },
        dmsReceived: { select: { id: true, senderId: true, content: true, createdAt: true } },
      },
    });
    res.json({
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      servers: user.serverMembers.map(s => ({ name: s.server.name, joinedAt: s.joinedAt })),
      friends: user.friends.map(f => ({ username: f.friendId, status: f.status, createdAt: f.createdAt })),
      dms: [
        ...user.dmsSent.map(m => ({ direction: 'sent', to: m.recipientId, content: m.content, at: m.createdAt })),
        ...user.dmsReceived.map(m => ({ direction: 'received', from: m.senderId, content: m.content, at: m.createdAt })),
      ],
      totalMessages: user.dmsSent.length + user.dmsReceived.length,
    });
  } catch (e) { next(e); }
});
