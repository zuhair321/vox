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
export function monitorDatabaseQueries() {
  return async (req, res, next) => {
    // Only enable in development
    if (env.NODE_ENV !== 'development') {
      return next();
    }

    const originalQuery = req.prisma ? req.prisma.$queryRawUnsafe : null;
    if (!originalQuery) {
      return next();
    }

    let queryCount = 0;
    let totalTime = 0;

    // Monkey patch the query method to monitor performance
    req.prisma.$queryRawUnsafe = async function (...args) {
      const queryStart = Date.now();
      try {
        return await originalQuery.apply(this, args);
      } finally {
        const queryDuration = Date.now() - queryStart;
        queryCount++;
        totalTime += queryDuration;
        
        // Log if individual query is slow
        if (queryDuration > 50) {
          console.warn(`[DB PERFORMANCE] Slow query (${queryDuration}ms):`, args[0]);
        }
      }
    };

    // Report database stats on response finish
    res.on('finish', () => {
      if (queryCount > 0) {
        const avgTime = totalTime / queryCount;
        console.debug(`[DB PERFORMANCE] ${queryCount} queries, ${totalTime}ms total, ${avgTime.toFixed(2)}ms avg`);
      }
    });

    next();
  };
}