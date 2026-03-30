module.exports = {
  apps: [{
    name: 'whatsapp-monks-engine',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
