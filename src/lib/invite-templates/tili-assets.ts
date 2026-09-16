/**
 * Файлы шаблона «Тили-тесто» — перенесены из репозитория-образца
 * (SupremeGoogle/wedding) вместе с вёрсткой. Разрешены в полях картинок
 * ровно эти пути: произвольный относительный адрес в `src` по-прежнему
 * не проходит (см. `imageRef` в `invite-blocks.ts`).
 */
export const TILI_MEDIA = "/media/invite-tili";

export const TILI_SAMPLE_IMAGES = [
  `${TILI_MEDIA}/bride-child.webp`,
  `${TILI_MEDIA}/groom-child.webp`,
  `${TILI_MEDIA}/couple-1.webp`,
  `${TILI_MEDIA}/couple-2.webp`,
  `${TILI_MEDIA}/venue.webp`,
  `${TILI_MEDIA}/dresscode.webp`,
] as const;

/** Конверт на заставке: по нажатию открывается приглашение и включается музыка. */
export const TILI_ENVELOPE = `${TILI_MEDIA}/envelope.webp`;

/**
 * Значки тайминга. В образце они подключены прямо с CDN Тильды, и шаблон
 * повторяет это как есть: файлов у нас нет, картинки грузятся оттуда же.
 */
export const TILI_TIMELINE_ICONS = [
  "https://static.tildacdn.com/tild3738-6363-4530-a338-336536326436/photo.png",
  "https://static.tildacdn.com/tild3965-6266-4365-a336-376562613538/photo.png",
  "https://static.tildacdn.com/tild6238-3535-4334-a534-303166623634/photo.png",
  "https://static.tildacdn.com/tild3436-3739-4765-b437-313136376430/Frame_1321316941.png",
] as const;
