/**
 * Аналитика платформы для суперадмина — из своей базы, без внешних
 * сервисов: Rybbit (посещаемость) на сервере в 1 ГБ не помещается и пока
 * не подключён, а главное — путь организатора и поведение гостей — и так
 * лежит в таблицах.
 *
 * Запросы сырые по той же причине, что и в stats.ts: защита тенантов в
 * `server/db.ts` не пускает запросы к таблицам мероприятия без eventId.
 */
import { db } from "@/server/db";

const n = (value: unknown) => Number(value ?? 0);

/** Путь организатора: сколько свадеб дошло до каждого шага. */
export type FunnelStep = { label: string; hint: string; value: number };

export async function organizerFunnel(): Promise<FunnelStep[]> {
  const [row] = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT
      (SELECT count(*) FROM users) AS users,
      (SELECT count(DISTINCT m."userId") FROM memberships m JOIN events e ON e."orgId" = m."orgId") AS with_event,
      (SELECT count(*) FROM events WHERE coalesce("inviteTheme"->>'template', '') <> '') AS with_template,
      (SELECT count(*) FROM events e WHERE EXISTS (SELECT 1 FROM guests g WHERE g."eventId" = e.id AND g."archivedAt" IS NULL)) AS with_guests,
      (SELECT count(*) FROM events WHERE status <> 'DRAFT') AS published,
      (SELECT count(*) FROM events e WHERE EXISTS (SELECT 1 FROM guests g WHERE g."eventId" = e.id AND g."rsvpAt" IS NOT NULL)) AS with_rsvp,
      (SELECT count(*) FROM events e WHERE EXISTS (SELECT 1 FROM photos p WHERE p."eventId" = e.id)) AS with_photos
  `;
  return [
    { label: "Зарегистрировались", hint: "пользователи", value: n(row.users) },
    { label: "Завели свадьбу", hint: "пользователи с мероприятием", value: n(row.with_event) },
    { label: "Выбрали шаблон", hint: "мероприятия", value: n(row.with_template) },
    { label: "Добавили гостей", hint: "мероприятия", value: n(row.with_guests) },
    { label: "Опубликовали", hint: "мероприятия", value: n(row.published) },
    { label: "Получили ответы", hint: "мероприятия с RSVP", value: n(row.with_rsvp) },
    { label: "Свадьба с фото гостей", hint: "мероприятия", value: n(row.with_photos) },
  ];
}

export type DailyMetric = { key: string; label: string; total: number; days: { day: string; value: number }[] };

/** По дням за `days` дней: шесть рядов, у каждого свой график. */
export async function dailyMetrics(days = 30): Promise<DailyMetric[]> {
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    WITH days AS (
      SELECT generate_series(date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') - (${days - 1} || ' days')::interval, date_trunc('day', now() AT TIME ZONE 'Europe/Moscow'), interval '1 day') AS day
    )
    SELECT d.day,
      (SELECT count(*) FROM users u WHERE date_trunc('day', (u."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS users,
      (SELECT count(*) FROM events e WHERE date_trunc('day', (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS events,
      (SELECT count(*) FROM guests g WHERE g."linkOpenedAt" IS NOT NULL AND date_trunc('day', (g."linkOpenedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS opens,
      (SELECT count(*) FROM guests g WHERE g."rsvpAt" IS NOT NULL AND date_trunc('day', (g."rsvpAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS rsvps,
      (SELECT count(*) FROM photos p WHERE date_trunc('day', (p."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS photos,
      (SELECT count(*) FROM wishes w WHERE date_trunc('day', (w."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS wishes
    FROM days d ORDER BY d.day
  `;
  const series = (key: string, label: string): DailyMetric => {
    const list = rows.map((row) => ({ day: (row.day as Date).toISOString().slice(0, 10), value: n(row[key]) }));
    return { key, label, total: list.reduce((sum, item) => sum + item.value, 0), days: list };
  };
  return [
    series("users", "Регистрации"),
    series("events", "Новые свадьбы"),
    series("opens", "Гости открыли приглашение"),
    series("rsvps", "Ответы гостей"),
    series("photos", "Фото от гостей"),
    series("wishes", "Пожелания"),
  ];
}

/** Как ведут себя гости: доли от всех гостей платформы. */
export async function guestBehaviour() {
  const [row] = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST') AS guests,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "linkOpenedAt" IS NOT NULL) AS opened,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "rsvpStatus" <> 'PENDING') AS answered,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "rsvpStatus" = 'DECLINED') AS declined,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "selfRegistered") AS self,
      (SELECT count(DISTINCT "guestId") FROM guest_action_log WHERE action IN ('checkin_claim', 'checkin_self')) AS checked_in,
      (SELECT count(DISTINCT "guestId") FROM photos WHERE "guestId" IS NOT NULL) AS photographers,
      (SELECT count(*) FROM photos WHERE status = 'REJECTED') AS photos_rejected,
      (SELECT count(*) FROM photos) AS photos
  `;
  return {
    guests: n(row.guests), opened: n(row.opened), answered: n(row.answered), declined: n(row.declined),
    selfRegistered: n(row.self), checkedIn: n(row.checked_in), photographers: n(row.photographers),
    photos: n(row.photos), photosRejected: n(row.photos_rejected),
  };
}

/** Самые живые свадьбы за последние 30 дней: ответы, фото, пожелания. */
export async function liveliestEvents(limit = 10) {
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM (
      SELECT e.id, e.title, e.status, e."eventDate", e."createdAt",
        (SELECT count(*) FROM guests g WHERE g."eventId" = e.id AND g."rsvpAt" > now() - interval '30 days') AS rsvps,
        (SELECT count(*) FROM photos p WHERE p."eventId" = e.id AND p."createdAt" > now() - interval '30 days') AS photos,
        (SELECT count(*) FROM wishes w WHERE w."eventId" = e.id AND w."createdAt" > now() - interval '30 days') AS wishes
      FROM events e
    ) activity
    WHERE rsvps + photos + wishes > 0
    ORDER BY rsvps + photos + wishes DESC, "createdAt" DESC
    LIMIT ${limit}
  `;
  return rows
    .map((row) => ({
      id: String(row.id), title: String(row.title), status: String(row.status), eventDate: row.eventDate as Date,
      rsvps: n(row.rsvps), photos: n(row.photos), wishes: n(row.wishes),
    }));
}

/** Шаблоны: сколько свадеб выбрали и сколько из них опубликовано. */
export async function templateConversion() {
  const rows = await db.$queryRaw<{ template: string; events: bigint; published: bigint }[]>`
    SELECT "inviteTheme"->>'template' AS template, count(*) AS events, count(*) FILTER (WHERE status <> 'DRAFT') AS published
    FROM events WHERE coalesce("inviteTheme"->>'template', '') <> ''
    GROUP BY 1 ORDER BY 2 DESC
  `;
  return rows.map((row) => ({ template: row.template, events: Number(row.events), published: Number(row.published) }));
}
