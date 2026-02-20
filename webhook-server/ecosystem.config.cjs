module.exports = {
  apps: [{
    name: 'webhook-server',
    script: 'server.js',
    cwd: '/root/innovatehub-hub/webhook-server',
    env: {
      NODE_ENV: 'production',
      PORT: 3790,
      GOOGLE_PLACES_API_KEY: 'AIzaSyAnjMCY_nQeuthpVaZOUR9ZLaITEveeapM',
      SERPAPI_KEY: '5c1e5157bd543c37082ed589dbfdf7f9ee3aada61b322172a29ca728adc3534e'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
