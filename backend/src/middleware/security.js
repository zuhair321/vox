import { logger } from '../lib/logger.js';
import { recordRequest } from '../lib/monitoring.js';
import { isRateLimited } from '../lib/redis.js';

// Security middleware for production
export function securityMiddleware(req, res, next) {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

// Request logging middleware with monitoring integration
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')?.slice(0, 200),
      referer: req.get('referer')?.slice(0, 200),
    };
    
    // Log with appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.url} ${res.statusCode}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.url} ${res.statusCode}`, logData);
    } else {
      logger.info(`${req.method} ${req.url} ${res.statusCode}`, logData);
    }
    
    // Record metrics for monitoring
    recordRequest(res.statusCode, duration);
  });
  
  next();
}

// Rate limiting middleware.
//
// Primary: a Redis-backed sliding-window limiter (isRateLimited) so limits are
// enforced consistently across all PM2 workers / instances. This replaces the
// old per-process in-memory Map, which silently multiplied the effective limit
// by the number of workers under cluster mode.
//
// Fallback: when Redis is not configured, we degrade to an in-memory limiter so
// a single-instance dev/small deploy still gets basic protection.
const memoryRequests = new Map();

function memoryLimit(key, windowMs, maxRequests) {
  const now = Date.now();
  const hits = (memoryRequests.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= maxRequests) return true;
  hits.push(now);
  memoryRequests.set(key, hits);
  if (memoryRequests.size > 10000) {
    for (const [k, times] of memoryRequests) {
      memoryRequests.set(k, times.filter((t) => now - t < windowMs));
    }
  }
  return false;
}

export function rateLimitMiddleware(options = {}) {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.maxRequests || 100;
  const scope = options.scope || 'global';

  return async (req, res, next) => {
    const key = `${req.ip || req.connection.remoteAddress || 'unknown'}`;

    let limited = false;
    try {
      limited = await isRateLimited(key, scope, maxRequests, windowMs);
    } catch {
      limited = memoryLimit(key, windowMs, maxRequests);
    }
    if (!limited) limited = memoryLimit(key, windowMs, maxRequests);

    if (limited) {
      logger.warn(`Rate limit exceeded for ${key} (scope=${scope})`);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    next();
  };
}

// Error tracking middleware. Logs unhandled errors centrally; Sentry (when
// SENTRY_DSN is set) captures these in src/server.js, so this is the local
// fallback that always runs.
export function errorTrackingMiddleware(err, req, res, next) {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });
  
  next(err);
}