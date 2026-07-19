module.exports = {
  apps: [{
    name: 'smartnet-api',
    script: 'src/index.js',
    cwd: '/var/www/smartnet/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
  }],
};
