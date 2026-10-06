/**
 * Сроки хранения после свадьбы.
 *
 * Отсчёт — от даты и времени свадьбы (`Event.eventDate`):
 *   — через 10 дней мероприятие само уходит в архив: гостевые ссылки, QR,
 *     альбом и экран перестают работать, а организатор ещё может скачать
 *     все фотографии архивом;
 *   — через 15 дней (ещё 5 дней в архиве) фотографии удаляются насовсем —
 *     и строки в базе, и файлы в хранилище. Список гостей, ответы и
 *     рассадка остаются.
 *
 * Перенесли дату вперёд — сроки сдвигаются вместе с ней: ошибка в дате
 * не должна стоить паре фотографий раньше времени.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const ARCHIVE_AFTER_DAYS = 10;
export const PURGE_AFTER_DAYS = ARCHIVE_AFTER_DAYS + 5;

export type RetentionStage = "active" | "archived" | "purged";

export function archiveAt(eventDate: Date): Date {
  return new Date(eventDate.getTime() + ARCHIVE_AFTER_DAYS * DAY_MS);
}

export function purgeAt(eventDate: Date): Date {
  return new Date(eventDate.getTime() + PURGE_AFTER_DAYS * DAY_MS);
}

export function retentionStage(eventDate: Date, now = new Date()): RetentionStage {
  if (now >= purgeAt(eventDate)) return "purged";
  if (now >= archiveAt(eventDate)) return "archived";
  return "active";
}

/** «22 июля» по времени площадки — для подсказок организатору. */
export function retentionDayLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: timezone }).format(date);
}
