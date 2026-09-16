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

/** Локальные SVG-значки: приглашение не зависит от доступности чужого CDN. */
export const TILI_TIMELINE_ICONS = [
  `${TILI_MEDIA}/icon-rings.svg`,
  `${TILI_MEDIA}/icon-glasses.svg`,
  `${TILI_MEDIA}/icon-dinner.svg`,
  `${TILI_MEDIA}/icon-dance.svg`,
] as const;
