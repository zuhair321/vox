import { logger } from '../lib/logger.js';
import { recordRequest } from '../lib/monitoring.js';

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

// Rate limiting middleware (simple in-memory for single instance)
const requests = new Map();

export function rateLimitMiddleware(options = {}) {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.maxRequests || 100;
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    const userRequests = requests.get(key) || [];
    
    // Clean old requests
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for ${key}`);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    // Cleanup old entries periodically
    if (requests.size > 10000) {
      for (const [k, times] of requests) {
        requests.set(k, times.filter(t => now - t < windowMs));
      }
    }
    
    next();
  };
}

// Error tracking middleware (placeholder for Sentry integration)
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