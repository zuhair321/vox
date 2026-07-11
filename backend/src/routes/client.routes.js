// VOX — Client telemetry routes (crash reports + push token registration).
// These power the "add crash reporting" and "add FCM push" launch items.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(rootDir, 'logs');
const CRASH_LOG = path.join(LOG_DIR, 'client-crash.log');
const PUSH_FILE = path.join(rootDir, 'data', 'push-tokens.json');

const router = express.Router();

// Throttle unauthenticated crash uploads to prevent abuse.
const crashLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function ensureDirs() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(PUSH_FILE), { recursive: true });
}

function readPushTokens() {
  try {
    return JSON.parse(fs.readFileSync(PUSH_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writePushTokens(map) {
  fs.writeFileSync(PUSH_FILE, JSON.stringify(map, null, 2));
}

/**
 * POST /api/client/crash
 * Body: { message, stack?, version?, platform?, extra? }
 * No auth — crashed clients may not have a valid session.
 */
router.post('/crash', crashLimiter, express.json({ limit: '64kb' }), (req, res) => {
  try {
    const { message, stack, version, platform, extra } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'message required' });
    }
    ensureDirs();
    const entry = {
      ts: new Date().toISOString(),
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 8000) : undefined,
      version: version ? String(version).slice(0, 50) : undefined,
      platform: platform ? String(platform).slice(0, 50) : undefined,
      extra: extra ? JSON.stringify(extra).slice(0, 2000) : undefined,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    };
    fs.appendFileSync(CRASH_LOG, JSON.stringify(entry) + '\n');
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'log failed' });
  }
});

/**
 * POST /api/notifications/register
 * Body: { token, platform }  — platform: 'android' | 'ios'
 * Requires auth. Stores the FCM/APNs token for the current user.
 * (Actual delivery requires a configured FCM server key / APNs cert.)
 */
router.post('/notifications/register', requireAuth, express.json(), (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, error: 'token required' });
    }
    ensureDirs();
    const map = readPushTokens();
    const userId = req.user?.id || 'unknown';
    map[token] = {
      userId,
      platform: platform === 'ios' ? 'ios' : 'android',
      updatedAt: new Date().toISOString(),
    };
    writePushTokens(map);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'store failed' });
  }
});

export const clientRouter = router;
