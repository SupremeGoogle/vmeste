/**
 * Поиск медиафайлов титульной страницы на диске.
 *
 * Файлы лежат в `public/media` и подставляются по имени: `hero.jpg`,
 * `gallery-1.jpg` и так далее (см. `public/media/README.md`). Наличие
 * проверяется на сервере при отрисовке — то есть страница знает, есть
 * снимок или нет, и не показывает браузеру ссылку в никуда.
 *
 * ВАЖНО: модуль читает файловую систему и потому пригоден только на
 * сервере. Клиентским компонентам путь передаётся пропсом, а рисует
 * его `photo.tsx`. Импорт этого файла из компонента с `"use client"`
 * роняет сборку целиком.
 */
import { existsSync } from "node:fs";
import path from "node:path";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");

/** Первое существующее расширение для этого имени. */
function resolve(base: string): string | null {
  for (const ext of ["jpg", "jpeg", "webp", "avif", "png"]) {
    if (existsSync(path.join(MEDIA_DIR, `${base}.${ext}`))) return `/media/${base}.${ext}`;
  }
  return null;
}

export function photoSrc(base: string): string | null {
  return resolve(base);
}

export function videoSrc(base: string): string | null {
  for (const ext of ["mp4", "webm"]) {
    if (existsSync(path.join(MEDIA_DIR, `${base}.${ext}`))) return `/media/${base}.${ext}`;
  }
  return null;
}

/** Сколько снимков галереи лежит на диске. */
export function galleryPhotos(count = 12): { src: string; index: number }[] {
  const found: { src: string; index: number }[] = [];
  for (let index = 1; index <= count; index += 1) {
    const src = resolve(`gallery-${index}`);
    if (src) found.push({ src, index });
  }
  return found;
}

/** Набор снимков для макетов возможностей — они рисуются на клиенте. */
export function featurePhotos(): { backdrop: string | null; screen: (string | null)[]; raffle: string | null } {
  return {
    backdrop: resolve("hero-2"),
    screen: [1, 2, 3, 4, 5, 6].map((index) => resolve(`gallery-${index}`)),
    raffle: resolve("gallery-9"),
  };
}
