import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Иначе Turbopack поднимается вверх по дереву и подхватывает чужой
  // package-lock.json из домашнего каталога.
  turbopack: { root: path.resolve(".") },

  async headers() {
    return [
      {
        // Вход по QR: страница статическая, пусть живёт в кеше браузера и CDN.
        // stale-while-revalidate на сутки — часть плана Б: при упавшем бэкенде
        // гость всё равно получает страницу (PLAN.md §2.5).
        source: "/e/:shortCode",
        headers: [
          { key: "cache-control", value: "public, max-age=60, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "cache-control", value: "public, max-age=0, must-revalidate" },
          { key: "service-worker-allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
