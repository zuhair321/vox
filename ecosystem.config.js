// ═══════════════════════════════════════════════════════════════
// VOX — PM2 Ecosystem Config (Production)
// ═══════════════════════════════════════════════════════════════
// Usage: pm2 start ecosystem.config.js
//        pm2 save
//        pm2 startup
//
// On Oracle Cloud Free Tier (Ampere A1, 4 OCPU / 24 GB RAM):
//   - 1 backend instance uses ~450 MB RAM
//   - PostgreSQL uses ~300 MB RAM
//   - Redis uses ~50 MB RAM
//   - Nginx uses ~10 MB RAM
//   Total: ~810 MB — plenty of headroom on 24 GB

module.exports = {
  apps: [
    {
      name: 'vox-backend',
      script: 'server.js',
      cwd: '/app',
      instances: 1,          // Single instance — Redis handles cross-worker state
      exec_mode: 'fork',     // Fork mode (not cluster) — WebSocket needs sticky sessions
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 30000,
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/app/logs/backend-error.log',
      out_file: '/app/logs/backend-out.log',
      merge_logs: true,
      // Restart strategy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
