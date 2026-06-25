// Auth routes: /api/auth/*
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import * as auth from '../services/auth.service.js';

export const authRouter = Router();

// Throttle login/register to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
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
    const result = await auth.register(data);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = parse(loginSchema, req.body);
    const result = await auth.login(data);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.post('/2fa/login', authLimiter, async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) throw new HttpError(400, 'tempToken and code are required.');
    const result = await auth.completeTwoFactorLogin(tempToken, code);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) throw new HttpError(400, 'refreshToken is required.');
    const result = await auth.refreshTokens(refreshToken);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await auth.logout(req.body?.refreshToken);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Current user info (authed) ────────────────────────────────
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user) return res.json({ user: auth.publicUser(user) });
    } catch {
      // DB unavailable — fall through to in-memory lookup
    }
    // Fallback: return user from token payload (works with in-memory auth)
    const user = {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.username,
      email: '',
      role: req.user.role || 'MEMBER',
      color: '#5865f2',
      status: 'online',
      bio: null,
      twoFactorEnabled: false,
    };
    return res.json({ user: auth.publicUser(user) });
  } catch (e) { return next(e); }
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(32).optional(),
  bio: z.string().max(255).nullable().optional(),
  status: z.enum(['ONLINE', 'IDLE', 'DND', 'OFFLINE']).optional(),
});

authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const data = parse(updateProfileSchema, req.body);
    try {
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
      });
      // Inform sockets if status changed
      if (data.status) {
        import('../sockets/index.js').then(({ emitAll }) => {
          emitAll('member:status', { userId: user.id, status: user.status });
        });
      }
      return res.json({ user: auth.publicUser(user) });
    } catch (e) {
      console.warn('[vox/auth] DB error during profile update:', e.message);
      return res.json({ ok: false, error: 'Database unavailable' });
    }
  } catch (e) { return next(e); }
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
