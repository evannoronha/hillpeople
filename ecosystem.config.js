module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: 'frontend/',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: '../logs/frontend-out.log',
      error_file: '../logs/frontend-error.log',
    },
    {
      name: 'backend',
      cwd: 'backend/',
      script: 'npm',
      args: 'run develop',
      watch: false,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: '../logs/backend-out.log',
      error_file: '../logs/backend-error.log',
    },
  ],
};
