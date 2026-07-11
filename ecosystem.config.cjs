// PM2 ecosystem config for VOX backend clustering.
//
// Usage:
//   pm2 start ecosystem.config.cjs           — start with max workers (1 per CPU)
//   pm2 start ecosystem.config.cjs -i 4      — start with 4 workers
//   pm2 status                               — check cluster status
//   pm2 logs vox-backend                     — tail logs
//   pm2 stop all && pm2 delete all           — stop everything
//
// Requires: npm install -g pm2

module.exports = {
  apps: [
    {
      name: 'vox-backend',
      script: './backend/server.js',
      cwd: __dirname,
      instances: 'max',        // 1 worker per CPU core
      exec_mode: 'cluster',    // enable Node.js cluster mode
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Graceful restart: send SIGINT, wait 5s for connections to drain.
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Auto-restart on crash, exponential backoff.
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      // Log config.
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
