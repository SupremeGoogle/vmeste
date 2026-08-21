/**
 * Экран в зале: токен доступа, снимок состояния, режимы.
 *
 * Экран — третий тип доступа наряду с именной ссылкой и коротким кодом
 * (PLAN.md §1.3): длинный секрет, который открывают один раз на ноутбуке
 * в зале и отзывают кнопкой. Он даёт только чтение одобренного и подписку
 * на поток; ни списка гостей, ни неодобренных фото через него не видно.
 *
 * Снимок (`screenSnapshot`) существует потому, что событие в потоке несёт
 * только `{type, id}`. Экран забирает снимок при первой загрузке и после
 * долгого разрыва — и это же делает его устойчивым: в худшем случае он
 * отстаёт на один запрос, а не показывает пустоту.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import type { OrgContext } from "@/server/context";
import type { ScreenMode } from "@/generated/prisma/enums";
import { bus } from "@/server/events/bus";

/** 192 бита: токен живёт на экране в зале неделями, подобрать нельзя. */
export function generateScreenToken(): string {
  return randomBytes(24).toString("base64url");
}

export type ScreenAccess = {
  eventId: string;
  orgId: string;
  eventTitle: string;
  tokenId: string;
};

/**
 * Проверка токена экрана. Отозванный не работает: кнопка «отозвать» должна
 * гасить чужой ноутбук немедленно, а не после перезагрузки страницы.
 */
export async function accessByScreenToken(token: string): Promise<ScreenAccess | null> {
  if (!token || token.length < 20) return null;

  const row = await db.screenToken.findUnique({
    where: { token },
    select: {
      id: true, eventId: true, orgId: true, revokedAt: true,
      event: { select: { title: true } },
    },
  });
  if (!row || row.revokedAt) return null;

  return {
    eventId: row.eventId,
    orgId: row.orgId,
    eventTitle: row.event.title,
    tokenId: row.id,
  };
}

/** Отметка «экран на связи» — организатор должен видеть, жив ли проектор. */
export async function touchScreen(tokenId: string, eventId: string): Promise<void> {
  await db.screenToken
    .updateMany({ where: { id: tokenId, eventId }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
}

export type ScreenPhoto = {
  id: string;
  guestName: string | null;
  width: number;
  height: number;
};

export type ScreenWish = {
  id: string;
  authorName: string;
  text: string;
};

export type ScreenSnapshot = {
  eventTitle: string;
  mode: ScreenMode;
  photos: ScreenPhoto[];
  wishes: ScreenWish[];
  raffle: {
    id: string;
    title: string;
    winnerLabel: string | null;
    drawnAt: string | null;
    entries: number;
    /** Имена для «барабана» на экране. Ограничены: крутится всё равно
     *  быстрее, чем глаз читает, а тащить на проектор триста строк незачем. */
    entryLabels: string[];
  } | null;
  /** Номер последнего события на момент снимка: с него экран продолжает поток. */
  seq: number;
};

/**
 * Полный снимок для экрана.
 *
 * Фото без превью сюда не попадают: на проектор нельзя выводить кадр,
 * который браузер не смог даже уменьшить (PLAN.md §5.5) — велик шанс, что
 * он не покажется и на большом экране, а пустой прямоугольник посреди зала
 * заметят все.
 */
export async function screenSnapshot(access: ScreenAccess, limit = 40): Promise<ScreenSnapshot> {
  const [event, photos, wishes, raffle] = await Promise.all([
    db.event.findFirst({
      where: { id: access.eventId, orgId: access.orgId },
      select: { title: true, screenMode: true },
    }),
    db.photo.findMany({
      where: { eventId: access.eventId, status: "APPROVED", previewOk: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, width: true, height: true,
        guest: { select: { displayName: true } },
      },
    }),
    db.wish.findMany({
      where: { eventId: access.eventId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, authorName: true, text: true },
    }),
    db.raffle.findFirst({
      where: { eventId: access.eventId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, winnerLabel: true, drawnAt: true,
        _count: { select: { entries: true } },
        entries: { select: { label: true }, orderBy: { label: "asc" }, take: 60 },
      },
    }),
  ]);

  return {
    eventTitle: event?.title ?? access.eventTitle,
    mode: event?.screenMode ?? "MIXED",
    photos: photos.map((photo) => ({
      id: photo.id,
      guestName: photo.guest?.displayName ?? null,
      width: photo.width,
      height: photo.height,
    })),
    wishes,
    raffle: raffle
      ? {
          id: raffle.id,
          title: raffle.title,
          winnerLabel: raffle.winnerLabel,
          drawnAt: raffle.drawnAt?.toISOString() ?? null,
          entries: raffle._count.entries,
          entryLabels: raffle.entries.map((entry) => entry.label),
        }
      : null,
    seq: bus.lastSeq(access.eventId),
  };
}

/** Переключение режима из панели. Экран узнаёт об этом событием, не опросом. */
export async function setScreenMode(ctx: OrgContext, eventId: string, mode: ScreenMode) {
  const updated = await db.event.updateMany({
    where: { id: eventId, orgId: ctx.orgId },
    data: { screenMode: mode },
  });
  if (updated.count === 0) return false;

  await bus.publish(eventId, "mode");
  return true;
}

export async function listScreenTokens(ctx: OrgContext, eventId: string) {
  return db.screenToken.findMany({
    where: { eventId, orgId: ctx.orgId },
    orderBy: { createdAt: "asc" },
    select: { id: true, token: true, label: true, lastSeenAt: true, revokedAt: true },
  });
}

export async function createScreenToken(ctx: OrgContext, eventId: string, label: string) {
  const event = await db.event.findFirst({
    where: { id: eventId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!event) return null;

  return db.screenToken.create({
    data: {
      orgId: ctx.orgId,
      eventId,
      label: label.trim().slice(0, 40) || "Проектор",
      token: generateScreenToken(),
    },
    select: { id: true, token: true, label: true },
  });
}

export async function revokeScreenToken(ctx: OrgContext, eventId: string, tokenId: string) {
  const updated = await db.screenToken.updateMany({
    where: { id: tokenId, eventId, orgId: ctx.orgId },
    data: { revokedAt: new Date() },
  });
  return updated.count === 1;
}
