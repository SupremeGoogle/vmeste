/**
 * Что владелец платформы узнаёт в Telegram (бот — `notify/telegram.ts`):
 *   — новая регистрация, новая свадьба, публикация приглашения;
 *   — ошибки сервера и ошибки в браузере гостей (одинаковые — не чаще
 *     раза в 30 минут, иначе одна поломка зальёт чат);
 *   — сводка за сутки каждое утро в 9:00 по Москве;
 *   — запуск сайта (выкладка или перезапуск после падения).
 * Падение сайта целиком ловит сторож на сервере (`vmeste-watchdog`), сроки
 * хранения — `services/retention.ts`, вход в панель — `admin/access.ts`.
 *
 * Отправка никогда не роняет то, что её вызвало: ошибки глотаются.
 */
import { db } from "@/server/db";
import { notifyOwner, telegramConfigured, type NotifyLevel } from "@/server/notify/telegram";

const sentAt = new Map<string, number>();
const DEDUPE_MS = 30 * 60_000;

/** Одинаковое сообщение — не чаще раза в 30 минут; счёт повторов приходит следом. */
export function notifyOnce(key: string, text: string, level: NotifyLevel = "warning"): void {
  if (!telegramConfigured()) return;
  const now = Date.now();
  const last = sentAt.get(key);
  if (last && now - last < DEDUPE_MS) return;
  sentAt.set(key, now);
  if (sentAt.size > 500) for (const [k, at] of sentAt) if (now - at > DEDUPE_MS) sentAt.delete(k);
  void notifyOwner(text, level).catch(() => false);
}

const clip = (text: string, max = 300) => (text.length > max ? `${text.slice(0, max)}…` : text);

export function notifySignup(email: string, name: string): void {
  void notifyOwner(`Новая регистрация: ${clip(name, 80)} <${email}>`).catch(() => false);
}

export function notifyEventCreated(title: string, eventDate: Date, by?: string): void {
  const day = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" }).format(eventDate);
  void notifyOwner(`Новая свадьба: «${clip(title, 120)}», ${day}${by ? ` — ${by}` : ""}`).catch(() => false);
}

export function notifyPublished(title: string, url: string): void {
  void notifyOwner(`Опубликовано приглашение «${clip(title, 120)}»\n${url}`).catch(() => false);
}

export function notifyServerError(error: unknown, where: string): void {
  const message = error instanceof Error ? error.message : String(error);
  // Ошибки «не найдено» и редиректы Next — это не поломки.
  // Гость ушёл со страницы до конца загрузки — тоже не поломка.
  if (/NEXT_NOT_FOUND|NEXT_REDIRECT|NEXT_HTTP_ERROR|destination stream closed early|aborted|ECONNRESET/i.test(message)) return;
  notifyOnce(`server:${where}:${message.slice(0, 120)}`, `Ошибка на сервере\n${clip(where, 200)}\n${clip(message, 600)}`, "alert");
}

export function notifyGuestError(message: string, page: string, template: string): void {
  notifyOnce(`guest:${template}:${message.slice(0, 120)}`, `Ошибка у гостя в браузере (${template})\n${clip(message, 400)}\n${clip(page, 200)}`, "warning");
}

type Digest = { users: bigint; events: bigint; published: bigint; rsvps: bigint; photos: bigint; totalUsers: bigint; totalEvents: bigint };

/** Сводка за прошедшие сутки. Сырой SQL: счёт по всей платформе. */
export async function dailyDigestText(): Promise<string> {
  const [row] = await db.$queryRaw<Digest[]>`
    SELECT
      (SELECT count(*) FROM users WHERE "createdAt" > now() - interval '1 day') AS users,
      (SELECT count(*) FROM events WHERE "createdAt" > now() - interval '1 day') AS events,
      (SELECT count(*) FROM events WHERE status = 'PUBLISHED') AS published,
      (SELECT count(*) FROM guests WHERE "rsvpAt" > now() - interval '1 day') AS rsvps,
      (SELECT count(*) FROM photos WHERE "createdAt" > now() - interval '1 day') AS photos,
      (SELECT count(*) FROM users) AS "totalUsers",
      (SELECT count(*) FROM events) AS "totalEvents"`;
  const os = await import("node:os");
  const freeMb = Math.round(os.freemem() / 1048576);
  const rssMb = Math.round(process.memoryUsage().rss / 1048576);
  return [
    "Сводка «Вместе» за сутки",
    `Регистраций: ${row.users} (всего ${row.totalUsers})`,
    `Новых свадеб: ${row.events} (всего ${row.totalEvents}, опубликовано ${row.published})`,
    `Ответов гостей: ${row.rsvps}`,
    `Фото гостей: ${row.photos}`,
    `Сервер: сайт ${rssMb} МБ, свободно ${freeMb} МБ, работает ${Math.round(process.uptime() / 3600)} ч`,
  ].join("\n");
}

/** Утренняя сводка в 9:00 по Москве и сообщение о запуске. Только production. */
export function startOwnerNotifications(): void {
  if (!telegramConfigured()) return;
  setTimeout(() => void notifyOwner("Сайт «Вместе» запущен (выкладка или перезапуск)").catch(() => false), 15_000).unref();
  let lastDay = "";
  setInterval(async () => {
    const moscow = new Date(Date.now() + 3 * 3600_000);
    const day = moscow.toISOString().slice(0, 10);
    if (moscow.getUTCHours() !== 9 || day === lastDay) return;
    lastDay = day;
    try {
      await notifyOwner(await dailyDigestText());
    } catch (error) {
      notifyServerError(error, "ежедневная сводка");
    }
  }, 5 * 60_000).unref();
}
