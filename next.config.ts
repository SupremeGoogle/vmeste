import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Иначе Turbopack поднимается вверх по дереву и подхватывает чужой
  // package-lock.json из домашнего каталога.
  turbopack: { root: path.resolve(".") },

  // Своя страница «не найдено» вместо стандартной английской (Next 16).
  experimental: { globalNotFound: true },

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
        // Приглашение без персонализации: та же логика, что и на входе по QR.
        // При упавшем бэкенде браузер и CDN ещё сутки отдают последнюю версию.
        source: "/i/:slug",
        headers: [
          { key: "cache-control", value: "public, max-age=60, stale-while-revalidate=86400" },
        ],
      },
      {
        // Именная страница — приватная: в ней имя гостя и его ответ.
        // Ни CDN, ни общий кеш браузера в интернет-кафе её хранить не должны.
        // `:token+`, а не `:token*`: со звёздочкой шаблон совпадает и с нулём
        // сегментов, то есть накрывает саму `/i/:slug` и лишает её кеша.
        source: "/i/:slug/:token+",
        headers: [
          { key: "cache-control", value: "private, no-store" },
          { key: "x-robots-tag", value: "noindex, nofollow" },
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
