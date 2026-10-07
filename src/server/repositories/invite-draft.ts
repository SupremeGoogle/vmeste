/**
 * Черновик приглашения и то, что видят гости.
 *
 * Редактор, как и раньше, правит живые строки `invite_blocks` и тему
 * мероприятия — это черновик. Гости видят снимок `events.publishedInvite`,
 * сделанный при публикации или кнопкой «Сохранить изменения». Так правка,
 * начатая вечером, не уезжает к двумстам гостям на полуслове, а
 * передумать можно кнопкой «Отменить изменения».
 *
 * Что в снимок не входит и меняется сразу: дата и площадка из настроек,
 * анкета, подарки, фото — это данные свадьбы, а не вид приглашения.
 * Нет снимка (приглашение ни разу не публиковали) — гостям отдаются
 * живые строки, как было до черновиков.
 */
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import type { BlockType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export type SnapshotBlock = { id: string; type: BlockType; order: number; visible: boolean; content: unknown };
export type InviteSnapshot = { theme: unknown; blocks: SnapshotBlock[] };

/** Снимок из базы, если он целый; иначе null — тогда гостям живые строки. */
export function readSnapshot(raw: unknown): InviteSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { theme?: unknown; blocks?: unknown };
  if (!Array.isArray(value.blocks)) return null;
  const blocks = value.blocks.filter((block): block is SnapshotBlock =>
    Boolean(block) && typeof block === "object" && typeof (block as SnapshotBlock).id === "string" && typeof (block as SnapshotBlock).type === "string");
  return { theme: value.theme ?? {}, blocks: blocks.sort((a, b) => a.order - b.order) };
}

/** JSON с ключами по алфавиту: jsonb в базе ключи переставляет. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

async function liveSnapshot(eventId: string, orgId: string): Promise<InviteSnapshot | null> {
  const event = await db.event.findFirst({ where: { id: eventId, orgId }, select: { inviteTheme: true } });
  if (!event) return null;
  const rows = await db.inviteBlock.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, type: true, order: true, visible: true, content: true },
  });
  return { theme: event.inviteTheme ?? {}, blocks: rows };
}

export type DraftState = {
  published: boolean;
  /** Есть правки, которых гости ещё не видят. */
  dirty: boolean;
};

export async function getDraftState(ctx: EventContext): Promise<DraftState> {
  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { status: true, publishedInvite: true } });
  if (!event) return { published: false, dirty: false };
  const published = event.status === "PUBLISHED";
  const snapshot = readSnapshot(event.publishedInvite);
  if (!published || !snapshot) return { published, dirty: false };
  const live = await liveSnapshot(ctx.eventId, ctx.orgId);
  return { published, dirty: Boolean(live) && stable(live) !== stable(snapshot) };
}

/** «Сохранить изменения» и публикация: гости начинают видеть черновик. */
export async function saveSnapshot(ctx: EventContext): Promise<boolean> {
  const live = await liveSnapshot(ctx.eventId, ctx.orgId);
  if (!live) return false;
  const updated = await db.event.updateMany({
    where: { id: ctx.eventId, orgId: ctx.orgId },
    data: { publishedInvite: live as unknown as Prisma.InputJsonValue },
  });
  return updated.count === 1;
}

/** «Отменить изменения»: черновик снова равен тому, что видят гости. */
export async function discardDraft(ctx: EventContext): Promise<boolean> {
  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { publishedInvite: true } });
  const snapshot = readSnapshot(event?.publishedInvite);
  if (!snapshot) return false;
  await db.$transaction([
    db.inviteBlock.deleteMany({ where: { eventId: ctx.eventId, orgId: ctx.orgId } }),
    db.inviteBlock.createMany({
      data: snapshot.blocks.map((block) => ({
        id: block.id, orgId: ctx.orgId, eventId: ctx.eventId, type: block.type, order: block.order,
        visible: block.visible, content: (block.content ?? {}) as Prisma.InputJsonValue,
      })),
    }),
    db.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { inviteTheme: (snapshot.theme ?? {}) as Prisma.InputJsonValue } }),
  ]);
  return true;
}

/**
 * Поправить видимость раздела и в снимке — для переключателей вне
 * редактора (виш-лист в настройках подарков): там нет кнопки «Сохранить»,
 * и галочка должна действовать на гостей сразу.
 */
export async function setSnapshotVisibility(ctx: EventContext, type: BlockType, visible: boolean): Promise<void> {
  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { publishedInvite: true } });
  const snapshot = readSnapshot(event?.publishedInvite);
  if (!snapshot || !snapshot.blocks.some((block) => block.type === type)) return;
  const blocks = snapshot.blocks.map((block) => (block.type === type ? { ...block, visible } : block));
  await db.event.updateMany({
    where: { id: ctx.eventId, orgId: ctx.orgId },
    data: { publishedInvite: { ...snapshot, blocks } as unknown as Prisma.InputJsonValue },
  });
}
