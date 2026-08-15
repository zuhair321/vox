// Performance monitoring middleware to identify bottlenecks
import { env } from '../lib/env.js';

export function monitorPerformance() {
  return async (req, res, next) => {
    // Skip in production to reduce overhead
    if (env.NODE_ENV === 'production') {
      return next();
    }

    const start = Date.now();
    const { method, url } = req;

    // Attach start time to request for use in route handlers
    req._startTime = start;

    // Listen for response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Log slow requests (>100ms in dev, >500ms in general)
      const isSlow = duration > (env.NODE_ENV === 'development' ? 100 : 500);
      if (isSlow) {
        console.warn(`[PERFORMANCE] Slow ${method} ${url} - ${duration}ms`);
      }
      
      // Always log in development for visibility
      if (env.NODE_ENV === 'development') {
        console.debug(`[PERFORMANCE] ${method} ${url} - ${duration}ms`);
      }
    });

    next();
  };
}

// Database query monitoring
