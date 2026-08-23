// ═══════════════════════════════════════════════════════════════
// VOX — Enterprise Middleware Suite
// ═══════════════════════════════════════════════════════════════
// Free enterprise features: security headers, compression,
// webhook signing, idempotency, feature flags, image optimization.
// ═══════════════════════════════════════════════════════════════

import crypto from 'node:crypto';
import { createGzip, createBrotliCompress } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

// ── 1. Security Headers (HSTS + CSP) ───────────────────────
export function securityHeaders(req, res, next) {
  // HSTS — Force HTTPS for 1 year, include subdomains
  if (process.env.SERVE_FRONTEND !== '1') { res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'); }
  
  // Content-Security-Policy — Restrict resource loading
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "img-src 'self' data: blob: http: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' ws: wss: http://127.0.0.1:*",
    "media-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
}

// ── 2. Compression Middleware ───────────────────────────────
export function compression(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  if (acceptEncoding.includes('br')) {
    res.setHeader('Content-Encoding', 'br');
    res.setHeader('Vary', 'Accept-Encoding');
    const brotli = createBrotliCompress();
    const originalEnd = res.end.bind(res);
    res.end = function(chunk, encoding) {
      if (chunk) {
        const compressed = [];
        brotli.on('data', (data) => compressed.push(data));
        brotli.on('end', () => originalEnd(Buffer.concat(compressed), encoding));
        brotli.write(chunk);
        brotli.end();
      } else {
        originalEnd(chunk, encoding);
      }
    };
  } else if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    const gzip = createGzip();
    const originalEnd = res.end.bind(res);
    res.end = function(chunk, encoding) {
      if (chunk) {
        const compressed = [];
        gzip.on('data', (data) => compressed.push(data));
        gzip.on('end', () => originalEnd(Buffer.concat(compressed), encoding));
        gzip.write(chunk);
        gzip.end();
      } else {
        originalEnd(chunk, encoding);
      }
    };
  }
  
  next();
}

// ── 3. Webhook Signing ─────────────────────────────────────
export function signWebhook(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
  return { timestamp, signature, header: `t=${timestamp},v1=${signature}` };
}

export function verifyWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  if (!signature) return false;
  
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  const timestamp = parseInt(parts.t || '0');
  const receivedSig = parts.v1;
  
  // Reject if timestamp is older than 5 minutes
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(req.body)}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));
}

// ── 4. Request Idempotency ─────────────────────────────────
const idempotencyStore = new Map(); // In production, use Redis

export function idempotency(options = {}) {
  const { ttl = 86400000 } = options; // 24 hours default
  
  return (req, res, next) => {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) return next();
    
    const cached = idempotencyStore.get(idempotencyKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return res.status(cached.status).json(cached.body);
    }
    
    // Store original json method
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      idempotencyStore.set(idempotencyKey, {
        status: res.statusCode,
        body,
        timestamp: Date.now(),
      });
      return originalJson(body);
    };
    
    next();
  };
}

// ── 5. Feature Flags ───────────────────────────────────────
const featureFlags = new Map([
  ['dark-mode', true],
  ['voice-channels', true],
  ['forums', true],
  ['soundboard', true],
  ['stages', true],
  ['webhooks', true],
  ['automod', true],
  ['badges', true],
  ['templates', true],
]);

export function featureFlagsMiddleware(req, res, next) {
  req.featureFlags = {
    isEnabled: (flag) => featureFlags.get(flag) ?? false,
    getAll: () => Object.fromEntries(featureFlags),
    set: (flag, value) => featureFlags.set(flag, value),
  };
  next();
}

// ── 6. Image Optimization (Sharp) ──────────────────────────
export async function optimizeImage(buffer, options = {}) {
  const { width = 800, quality = 80, format = 'webp' } = options;
  
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .toFormat(format, { quality })
      .toBuffer();
  } catch {
    // Sharp not available, return original
    return buffer;
  }
}

// ── 7. API Version Header ──────────────────────────────────
export function apiVersion(req, res, next) {
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-API-Deprecated', 'false');
  next();
}

// ── 8. Request ID ──────────────────────────────────────────
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// ── 9. CORS Preflight Cache ────────────────────────────────
export function corsCache(req, res, next) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }
  next();
}

// ── 10. Health Check Enhancement ───────────────────────────
export function enhancedHealthCheck(healthFn) {
  return async (req, res) => {
    const start = Date.now();
    try {
      const health = await healthFn();
      const duration = Date.now() - start;
      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        duration: `${duration}ms`,
        ...health,
      });
    } catch (err) {
      res.status(503).json({
        ok: false,
        timestamp: new Date().toISOString(),
        error: err.message,
      });
    }
  };
}

export default {
  securityHeaders,
  compression,
  signWebhook,
  verifyWebhook,
  idempotency,
  featureFlagsMiddleware,
  optimizeImage,
  apiVersion,
  requestId,
  corsCache,
  enhancedHealthCheck,
};
