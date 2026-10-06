import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Локальный просмотр по IP должен загружать те же скрипты, что localhost.
  allowedDevOrigins: ["127.0.0.1"],
  // Иначе Turbopack поднимается вверх по дереву и подхватывает чужой
  // package-lock.json из домашнего каталога.
  turbopack: { root: path.resolve(".") },

  // Своя страница «не найдено» вместо стандартной английской (Next 16).
  experimental: { globalNotFound: true },

  // libheif в WASM ищет свой .wasm рядом с модулем — пусть Node грузит его
  // сам, а не бандлер. `sharp` Next и так держит снаружи. Фильтр 18+
  // (TensorFlow) живёт в отдельном процессе workers/nsfw.mjs и в сборку не попадает.
  serverExternalPackages: ["heic-decode", "libheif-js"],

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

// Sentry: ошибки сервера и браузера. Отчёты браузера идут через наш адрес
// /monitoring — их не режут блокировщики и сетевые фильтры. Карты кода
// загружаются, только если задан SENTRY_AUTH_TOKEN (на сборке в CI/сервере).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sentryUrl: process.env.SENTRY_URL,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
