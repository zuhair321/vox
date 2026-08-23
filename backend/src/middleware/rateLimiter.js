// ═══════════════════════════════════════════════════════════════
// VOX — Shared Rate Limiter Middleware
// ═══════════════════════════════════════════════════════════════
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const ipKey = ipKeyGenerator;

// Standard: 100 req/min
export const standard = rateLimit({
  windowMs: 60_000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  keyGenerator: ipKey,
});

// Strict: 20 req/15min (auth, sensitive)
export const strict = rateLimit({
  windowMs: 900_000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
  keyGenerator: ipKey,
});

// Sensitive: 5 req/min (password reset, 2FA)
export const sensitive = rateLimit({
  windowMs: 60_000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' },
  keyGenerator: ipKey,
});

// Upload: 30 req/min
export const upload = rateLimit({
  windowMs: 60_000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Upload limit reached.' },
  keyGenerator: ipKey,
});

// Search: 30 req/min
export const search = rateLimit({
  windowMs: 60_000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Search limit reached.' },
  keyGenerator: ipKey,
});

// Voice: 60 req/min
export const voice = rateLimit({
  windowMs: 60_000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Voice operation limit reached.' },
  keyGenerator: ipKey,
});

// API key: 200 req/min
export const apiKey = rateLimit({
  windowMs: 60_000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'API rate limit exceeded.' },
  keyGenerator: ipKey,
});

export default { standard, strict, sensitive, upload, search, voice, apiKey };
