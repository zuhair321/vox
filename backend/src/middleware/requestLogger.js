// ═══════════════════════════════════════════════════════════════
// VOX — Request Logger Middleware
// ═══════════════════════════════════════════════════════════════
// Logs HTTP requests with timing, status, and method.

export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const path = req.originalUrl || req.url;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    
    // Color codes for terminal output
    const statusColor = status >= 500 ? '\x1b[31m' : // red
                        status >= 400 ? '\x1b[33m' : // yellow
                        status >= 300 ? '\x1b[36m' : // cyan
                        '\x1b[32m'; // green
    const reset = '\x1b[0m';
    
    // Skip health checks in production
    if (process.env.NODE_ENV === 'production' && path.includes('/health')) return;
    
    console.log(
      `${statusColor}${status}${reset} ${method.padEnd(7)} ${duration}ms ${path}` +
      (ip ? ` from ${ip}` : '')
    );
  });
  
  next();
}

export default requestLogger;
