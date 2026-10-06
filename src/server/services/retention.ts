/**
 * Сроки хранения после свадьбы (правило — в `lib/retention.ts`):
 * через 10 дней мероприятие уходит в архив, через 15 — фотографии
 * удаляются насовсем.
 *
 * Запускается раз в час из `instrumentation.ts` (только в production) и
 * вручную — `npm run retention`. Каждый шаг повторяем: упало посередине —
 * следующий запуск доделает, ничего не удалится дважды и не потеряется.
 */
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { deleteObjects, deletePrefix } from "@/server/storage/s3";
import { ARCHIVE_AFTER_DAYS, PURGE_AFTER_DAYS } from "@/lib/retention";
import { retentionExemptEmails } from "@/server/admin/config";

const DAY_MS = 24 * 60 * 60 * 1000;
/** DeleteObjects принимает до 1000 ключей, у фото их два. */
const BATCH = 400;

export type RetentionReport = { archived: number; purgedEvents: number; purgedPhotos: number };

/** Свадьбы суперадмина под сроки не попадают (см. retentionExemptEmails). */
function notExempt(emails: string[]) {
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM memberships m JOIN users u ON u.id = m."userId"
    WHERE m."orgId" = e."orgId" AND m.role = 'OWNER' AND u.email = ANY(${emails}::citext[]))`;
}

/** Не трогают ли сроки хранения свадьбы этой организации. */
export async function isRetentionExempt(orgId: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ one: number }[]>`
    SELECT 1 AS one FROM memberships m JOIN users u ON u.id = m."userId"
    WHERE m."orgId" = ${orgId} AND m.role = 'OWNER' AND u.email = ANY(${retentionExemptEmails()}::citext[])
    LIMIT 1`;
  return rows.length > 0;
}

/** Свадьбы, прошедшие больше 10 дней назад и ещё не в архиве, — в архив. */
async function archiveFinished(now: Date): Promise<{ id: string; slug: string }[]> {
  const before = new Date(now.getTime() - ARCHIVE_AFTER_DAYS * DAY_MS);
  // Список по всей платформе — сырой запрос: ограничитель арендаторов
  // в db.ts пропускает только запросы внутри одного мероприятия.
  return db.$queryRaw<{ id: string; slug: string }[]>`
    UPDATE events e SET status = 'ARCHIVED', "updatedAt" = now()
    WHERE e.status <> 'ARCHIVED' AND e."eventDate" <= ${before} AND ${notExempt(retentionExemptEmails())}
    RETURNING e.id, e.slug`;
}

/** Удалить фото одного мероприятия: файлы, затем строки — пачками. */
export async function purgeEventPhotos(eventId: string): Promise<number> {
  let removed = 0;
  for (;;) {
    const photos = await db.photo.findMany({
      where: { eventId },
      select: { id: true, storageKey: true, thumbKey: true },
      take: BATCH,
    });
    if (!photos.length) break;
    // Сначала файлы: строка без файла видна как битая картинка, а файл без
    // строки не найдёт уже никто — и он остался бы в бакете навсегда.
    await deleteObjects(photos.flatMap((photo) => [photo.storageKey, photo.thumbKey]));
    const { count } = await db.photo.deleteMany({ where: { eventId, id: { in: photos.map((photo) => photo.id) } } });
    removed += count;
  }
  // Загрузки, брошенные на полпути (файл есть, строки нет), — тоже.
  await deletePrefix(`events/${eventId}/photos/`);
  await deletePrefix(`events/${eventId}/thumbs/`);
  return removed;
}

/**
 * Чьи фото пора удалить: у кого они ещё есть в базе — и все, чей срок
 * истёк за последние двое суток, даже без строк: у них могли остаться
 * файлы брошенных загрузок. Дальше двух суток пустые свадьбы не
 * перебираются — их хранилище уже вычищено прошлыми запусками.
 */
async function eventsToPurge(now: Date): Promise<string[]> {
  const before = new Date(now.getTime() - PURGE_AFTER_DAYS * DAY_MS);
  const recent = new Date(before.getTime() - 2 * DAY_MS);
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT e.id FROM events e
    WHERE e."eventDate" <= ${before} AND ${notExempt(retentionExemptEmails())}
      AND (e."eventDate" > ${recent} OR EXISTS (SELECT 1 FROM photos p WHERE p."eventId" = e.id))`;
  return rows.map((row) => row.id);
}

let running = false;

export async function runRetention(now = new Date()): Promise<RetentionReport> {
  // Запуски не накладываются: час между ними, но удаление большого альбома
  // по медленному хранилищу может затянуться.
  if (running) return { archived: 0, purgedEvents: 0, purgedPhotos: 0 };
  running = true;
  try {
    const archived = await archiveFinished(now);
    if (archived.length) await dropGuestCaches(archived);

    let purgedPhotos = 0;
    let purgedEvents = 0;
    for (const eventId of await eventsToPurge(now)) {
      const removed = await purgeEventPhotos(eventId);
      purgedPhotos += removed;
      if (removed) purgedEvents++;
    }

    return { archived: archived.length, purgedEvents, purgedPhotos };
  } finally {
    running = false;
  }
}

/** Гостевые страницы закешированы на минуту — сбросить сразу, если можно. */
async function dropGuestCaches(events: { id: string; slug: string }[]) {
  try {
    const { revalidateTag } = await import("next/cache");
    const { allEventTags } = await import("@/lib/cache-tags");
    for (const event of events) for (const tag of allEventTags(event.id, event.slug)) revalidateTag(tag, "max");
  } catch {
    // Вне Next (скрипт) кеша нет, а в Next он истечёт сам через минуту.
  }
}

/** Фоновый запуск раз в час. Ошибки — в Sentry и владельцу в Telegram. */
export function startRetentionSchedule(): void {
  const tick = async () => {
    try {
      const report = await runRetention();
      if (report.archived || report.purgedPhotos) {
        const { notifyOwner } = await import("@/server/notify/telegram");
        await notifyOwner(
          `Хранение: в архив — ${report.archived}, удалено фото — ${report.purgedPhotos} (свадеб: ${report.purgedEvents})`,
          "info",
        );
      }
    } catch (error) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error);
      const { notifyOwner } = await import("@/server/notify/telegram");
      await notifyOwner(`Сроки хранения: запуск упал — ${String((error as Error)?.message ?? error)}`, "alert").catch(() => false);
    }
  };
  // Первый запуск — через минуту после старта, чтобы не мешать прогреву.
  setTimeout(tick, 60_000).unref();
  setInterval(tick, 60 * 60_000).unref();
}
