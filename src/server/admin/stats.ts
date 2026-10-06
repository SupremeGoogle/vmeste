/**
 * Статистика всей платформы для панели суперадмина.
 *
 * Сырым SQL, а не запросами Prisma по моделям: страж мультиарендности
 * (server/db.ts) справедливо не даёт читать гостей и фото без фильтра по
 * мероприятию — а здесь как раз нужен счёт по всем сразу. Одна выборка
 * вместо двух десятков `count()`.
 */
import { db } from "@/server/db";

const n = (value: unknown) => Number(value ?? 0);

export type PlatformStats = {
  users: { total: number; new7: number; new30: number; google: number; blocked: number; active7: number };
  orgs: number;
  events: { total: number; draft: number; published: number; archived: number; upcoming30: number; new7: number };
  guests: { total: number; accepted: number; declined: number; pending: number; selfRegistered: number; opened: number };
  content: { photos: number; photoBytes: number; assetBytes: number; wishes: number; gifts: number; giftsReserved: number };
  sessions: { active: number };
};

export async function platformStats(): Promise<PlatformStats> {
  const [row] = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT
      (SELECT count(*) FROM users) AS users_total,
      (SELECT count(*) FROM users WHERE "createdAt" > now() - interval '7 days') AS users_new7,
      (SELECT count(*) FROM users WHERE "createdAt" > now() - interval '30 days') AS users_new30,
      (SELECT count(DISTINCT "userId") FROM oauth_accounts WHERE provider = 'GOOGLE') AS users_google,
      (SELECT count(*) FROM users WHERE "blockedAt" IS NOT NULL) AS users_blocked,
      (SELECT count(DISTINCT "userId") FROM sessions WHERE "createdAt" > now() - interval '7 days') AS users_active7,
      (SELECT count(*) FROM organizations) AS orgs,
      (SELECT count(*) FROM events) AS events_total,
      (SELECT count(*) FROM events WHERE status = 'DRAFT') AS events_draft,
      (SELECT count(*) FROM events WHERE status = 'PUBLISHED') AS events_published,
      (SELECT count(*) FROM events WHERE status = 'ARCHIVED') AS events_archived,
      (SELECT count(*) FROM events WHERE "eventDate" BETWEEN now() AND now() + interval '30 days') AS events_upcoming30,
      (SELECT count(*) FROM events WHERE "createdAt" > now() - interval '7 days') AS events_new7,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST') AS guests_total,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "rsvpStatus" = 'ACCEPTED') AS guests_accepted,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "rsvpStatus" = 'DECLINED') AS guests_declined,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "selfRegistered") AS guests_self,
      (SELECT count(*) FROM guests WHERE "archivedAt" IS NULL AND role = 'GUEST' AND "linkOpenedAt" IS NOT NULL) AS guests_opened,
      (SELECT count(*) FROM photos) AS photos,
      (SELECT coalesce(sum(bytes), 0) FROM photos) AS photo_bytes,
      (SELECT coalesce(sum(bytes), 0) FROM event_assets) AS asset_bytes,
      (SELECT count(*) FROM wishes) AS wishes,
      (SELECT count(*) FROM gifts) AS gifts,
      (SELECT count(*) FROM gift_reservations) AS gifts_reserved,
      (SELECT count(*) FROM sessions WHERE "expiresAt" > now()) AS sessions_active
  `;
  const guestsTotal = n(row.guests_total);
  const accepted = n(row.guests_accepted);
  const declined = n(row.guests_declined);
  return {
    users: { total: n(row.users_total), new7: n(row.users_new7), new30: n(row.users_new30), google: n(row.users_google), blocked: n(row.users_blocked), active7: n(row.users_active7) },
    orgs: n(row.orgs),
    events: { total: n(row.events_total), draft: n(row.events_draft), published: n(row.events_published), archived: n(row.events_archived), upcoming30: n(row.events_upcoming30), new7: n(row.events_new7) },
    guests: { total: guestsTotal, accepted, declined, pending: guestsTotal - accepted - declined, selfRegistered: n(row.guests_self), opened: n(row.guests_opened) },
    content: { photos: n(row.photos), photoBytes: n(row.photo_bytes), assetBytes: n(row.asset_bytes), wishes: n(row.wishes), gifts: n(row.gifts), giftsReserved: n(row.gifts_reserved) },
    sessions: { active: n(row.sessions_active) },
  };
}

/**
 * Регистрации, новые мероприятия и ответы гостей по дням за `days` дней.
 * Дни — московские: время в базе хранится в UTC, и без перевода
 * регистрация в 01:00 по Москве попадала во вчерашний столбик.
 */
export async function dailySeries(days = 30): Promise<{ day: string; users: number; events: number; rsvps: number }[]> {
  const rows = await db.$queryRaw<{ day: Date; users: bigint; events: bigint; rsvps: bigint }[]>`
    WITH days AS (
      SELECT generate_series(date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') - (${days - 1} || ' days')::interval, date_trunc('day', now() AT TIME ZONE 'Europe/Moscow'), interval '1 day') AS day
    )
    SELECT d.day,
      (SELECT count(*) FROM users u WHERE date_trunc('day', (u."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS users,
      (SELECT count(*) FROM events e WHERE date_trunc('day', (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS events,
      (SELECT count(*) FROM guests g WHERE g."rsvpAt" IS NOT NULL AND date_trunc('day', (g."rsvpAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow') = d.day) AS rsvps
    FROM days d ORDER BY d.day
  `;
  return rows.map((row) => ({ day: row.day.toISOString().slice(0, 10), users: Number(row.users), events: Number(row.events), rsvps: Number(row.rsvps) }));
}

export type AdminUserRow = {
  id: string; email: string; name: string; createdAt: Date; emailVerified: boolean;
  platformRole: "ADMIN" | "SUPPORT" | null; blockedAt: Date | null; blockedReason: string | null;
  google: boolean; lastSeen: Date | null; events: number; guests: number;
};

/** Пользователи с поиском по почте и имени. */
export async function listUsers(query: string, limit = 50, offset = 0): Promise<AdminUserRow[]> {
  const like = `%${query.trim().replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT u.id, u.email, u.name, u."createdAt", u."emailVerified", u."platformRole", u."blockedAt", u."blockedReason",
      EXISTS (SELECT 1 FROM oauth_accounts a WHERE a."userId" = u.id AND a.provider = 'GOOGLE') AS google,
      (SELECT max(s."createdAt") FROM sessions s WHERE s."userId" = u.id) AS last_seen,
      (SELECT count(*) FROM events e JOIN memberships m ON m."orgId" = e."orgId" WHERE m."userId" = u.id) AS events,
      (SELECT count(*) FROM guests g JOIN memberships m ON m."orgId" = g."orgId" WHERE m."userId" = u.id AND g."archivedAt" IS NULL AND g.role = 'GUEST') AS guests
    FROM users u
    WHERE ${query.trim()} = '' OR u.email ILIKE ${like} OR u.name ILIKE ${like}
    ORDER BY u."createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map((row) => ({
    id: String(row.id), email: String(row.email), name: String(row.name), createdAt: row.createdAt as Date,
    emailVerified: Boolean(row.emailVerified), platformRole: (row.platformRole as AdminUserRow["platformRole"]) ?? null,
    blockedAt: (row.blockedAt as Date | null) ?? null, blockedReason: (row.blockedReason as string | null) ?? null,
    google: Boolean(row.google), lastSeen: (row.last_seen as Date | null) ?? null, events: n(row.events), guests: n(row.guests),
  }));
}

export type AdminEventRow = {
  id: string; title: string; slug: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; eventDate: Date; createdAt: Date;
  template: string | null; orgName: string; ownerEmail: string | null; guests: number; accepted: number; photos: number;
};

export async function listEvents(query: string, limit = 50, offset = 0, ownerId?: string): Promise<AdminEventRow[]> {
  const like = `%${query.trim().replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT e.id, e.title, e.slug, e.status, e."eventDate", e."createdAt", e."inviteTheme"->>'template' AS template, o.name AS org_name,
      (SELECT u.email FROM memberships m JOIN users u ON u.id = m."userId" WHERE m."orgId" = e."orgId" ORDER BY m.id LIMIT 1) AS owner_email,
      (SELECT count(*) FROM guests g WHERE g."eventId" = e.id AND g."archivedAt" IS NULL AND g.role = 'GUEST') AS guests,
      (SELECT count(*) FROM guests g WHERE g."eventId" = e.id AND g."archivedAt" IS NULL AND g.role = 'GUEST' AND g."rsvpStatus" = 'ACCEPTED') AS accepted,
      (SELECT count(*) FROM photos p WHERE p."eventId" = e.id) AS photos
    FROM events e JOIN organizations o ON o.id = e."orgId"
    WHERE (${query.trim()} = '' OR e.title ILIKE ${like} OR e.slug ILIKE ${like} OR o.name ILIKE ${like})
      AND (${ownerId ?? ""} = '' OR e."orgId" IN (SELECT "orgId" FROM memberships WHERE "userId" = ${ownerId ?? ""}))
    ORDER BY e."createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map((row) => ({
    id: String(row.id), title: String(row.title), slug: String(row.slug), status: row.status as AdminEventRow["status"],
    eventDate: row.eventDate as Date, createdAt: row.createdAt as Date, template: (row.template as string | null) || null,
    orgName: String(row.org_name), ownerEmail: (row.owner_email as string | null) ?? null,
    guests: n(row.guests), accepted: n(row.accepted), photos: n(row.photos),
  }));
}

/** Популярность шаблонов приглашений. */
export async function templateUsage(): Promise<{ template: string; events: number }[]> {
  const rows = await db.$queryRaw<{ template: string | null; events: bigint }[]>`
    SELECT coalesce(nullif("inviteTheme"->>'template', ''), '—') AS template, count(*) AS events
    FROM events GROUP BY 1 ORDER BY 2 DESC
  `;
  return rows.map((row) => ({ template: row.template ?? "—", events: Number(row.events) }));
}

/** Состояние сервера: база, память, время работы. */
export async function systemHealth(): Promise<{ dbMs: number | null; memoryMb: number; uptimeHours: number; node: string }> {
  const started = Date.now();
  let dbMs: number | null = null;
  try {
    await db.$queryRaw`SELECT 1`;
    dbMs = Date.now() - started;
  } catch {
    dbMs = null;
  }
  return {
    dbMs,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    uptimeHours: Math.round(process.uptime() / 360) / 10,
    node: process.version,
  };
}
