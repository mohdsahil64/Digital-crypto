// PM2 process manager config — runs on the VPS.
// Start with:  pm2 start ecosystem.config.cjs
// Save:        pm2 save
// Auto-start:  pm2 startup  (run the command it prints)

module.exports = {
  apps: [
    {
      name: "dw-backend",
      cwd: "./backend",
      script: "src/index.js",
      interpreter: "node",
      // Node ESM flag not needed for Node 18+ (already supported)
      instances: 1,             // single instance is fine; use "max" for cluster mode
      exec_mode: "fork",
      watch: false,             // never watch in production
      max_memory_restart: "500M",

      // Pass production env vars here OR keep them in backend/.env (both work).
      // Values here override .env. Leave blank and let .env carry the secrets.
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },

      // Logging
      out_file: "./logs/backend-out.log",
      error_file: "./logs/backend-err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Auto-restart on crash
      autorestart: true,
      restart_delay: 3000,
    },

    // Daily reward accrual — runs once a day via PM2 cron.
    // Replaces a system cron job; PM2 restarts it automatically after each run.
    {
      name: "dw-daily-accrual",
      cwd: "./backend",
      script: "src/scripts/dailyAccrual.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: false,       // one-shot — don't loop endlessly
      cron_restart: "0 0 * * *", // midnight UTC every day
      env_production: {
        NODE_ENV: "production",
      },
      out_file: "./logs/accrual-out.log",
      error_file: "./logs/accrual-err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
