// PM2 process file shipped inside every release bundle (next to server.js).
// nginx proxies to 127.0.0.1:3001 (3000 belongs to the marketing website), so the
// Node server is not exposed publicly.
module.exports = {
  apps: [
    {
      name: "lendigo-next-frontend",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
}
