// pm2: «Вместе» на 127.0.0.1:3010. Память сервера — 1 ГБ на три сайта,
// поэтому потолок кучи и перезапуск при разрастании.
module.exports = {
  apps: [{
    name: "vmeste",
    cwd: "/var/www/vmeste/current",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3010 -H 127.0.0.1",
    node_args: "--max-old-space-size=384",
    env: { NODE_ENV: "production" },
    max_memory_restart: "520M",
    kill_timeout: 10000,
    time: true,
  }],
};
