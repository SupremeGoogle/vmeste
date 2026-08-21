/**
 * Репозиторий приглашения: блоки конструктора и публичное чтение.
 *
 * Порядок блоков хранится числом с уникальным ограничением `(eventId, order)`.
 * Из-за него перестановка соседей — это не два `update` подряд: первый же
 * упрётся в занятый номер. Все перестановки идут через `renumber` в одной
 * транзакции: сначала все номера уводятся в отрицательные, потом
 * расставляются заново подряд. Заодно это лечит дыры в нумерации после
 * удалений.
 */
import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import type { BlockType } from "@/generated/prisma/enums";
import { defaultContent, readBlockContent } from "@/lib/invite-blocks";
import { eventTag as eventCacheTag, inviteSlugTag as inviteCacheTag } from "@/lib/cache-tags";
import type { AnyBlockContent } from "@/lib/invite-blocks";

/**
 * Теги кеша живут в `lib/cache-tags.ts` (PLAN.md §5.7). Сбрасывает их
 * не репозиторий, а серверное действие, которое правит блоки: `updateTag`
 * разрешён только внутри Server Action, а репозиторий вызывается ещё и
 * из тестов, где никакого запроса Next вокруг нет.
 */
export { eventTag, inviteSlugTag } from "@/lib/cache-tags";

export type InviteBlockView = {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  content: AnyBlockContent;
  /** Содержимое не разобралось схемой целиком — часть полей по умолчанию. */
  degraded: boolean;
};

function toView(row: {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  content: unknown;
}): InviteBlockView {
  const { content, degraded } = readBlockContent(row.type, row.content);
  return { id: row.id, type: row.type, order: row.order, visible: row.visible, content, degraded };
}

export async function listBlocks(ctx: EventContext): Promise<InviteBlockView[]> {
  const rows = await db.inviteBlock.findMany({
    where: { eventId: ctx.eventId },
    orderBy: { order: "asc" },
  });
  return rows.map(toView);
}

export async function addBlock(ctx: EventContext, type: BlockType) {
  const last = await db.inviteBlock.findFirst({
    where: { eventId: ctx.eventId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const block = await db.inviteBlock.create({
    data: {
      orgId: ctx.orgId,
      eventId: ctx.eventId,
      type,
      order: (last?.order ?? -1) + 1,
      content: defaultContent(type),
    },
  });
  return block;
}

export async function updateBlockContent(
  ctx: EventContext,
  blockId: string,
  content: AnyBlockContent,
) {
  const updated = await db.inviteBlock.updateMany({
    where: { id: blockId, eventId: ctx.eventId },
    data: { content },
  });
  return updated.count === 1;
}

export async function setBlockVisible(ctx: EventContext, blockId: string, visible: boolean) {
  await db.inviteBlock.updateMany({
    where: { id: blockId, eventId: ctx.eventId },
    data: { visible },
  });
}

export async function deleteBlock(ctx: EventContext, blockId: string) {
  await db.$transaction(async (tx) => {
    await tx.inviteBlock.deleteMany({ where: { id: blockId, eventId: ctx.eventId } });
    await renumber(tx, ctx.eventId);
  });
}

/** Сдвиг блока на одну позицию. `dir` = -1 вверх, +1 вниз. */
export async function moveBlock(ctx: EventContext, blockId: string, dir: -1 | 1) {
  await db.$transaction(async (tx) => {
    const blocks = await tx.inviteBlock.findMany({
      where: { eventId: ctx.eventId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    const from = blocks.findIndex((b) => b.id === blockId);
    if (from === -1) return;
    const to = from + dir;
    if (to < 0 || to >= blocks.length) return;

    const reordered = [...blocks];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    await renumber(tx, ctx.eventId, reordered.map((b) => b.id));
  });
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Расставить номера подряд. Два прохода: сначала в отрицательную зону,
 * потом обратно. Иначе первое же присвоение налетит на `@@unique([eventId, order])`,
 * потому что старый владелец номера ещё не сдвинулся.
 */
async function renumber(tx: Tx, eventId: string, order?: string[]) {
  const ids =
    order ??
    (
      await tx.inviteBlock.findMany({
        where: { eventId },
        orderBy: { order: "asc" },
        select: { id: true },
      })
    ).map((b) => b.id);

  for (const [index, id] of ids.entries()) {
    await tx.inviteBlock.updateMany({ where: { id, eventId }, data: { order: -1 - index } });
  }
  for (const [index, id] of ids.entries()) {
    await tx.inviteBlock.updateMany({ where: { id, eventId }, data: { order: index } });
  }
}

// ────────────────────────────────────────────────────────────
// Публичное чтение
// ────────────────────────────────────────────────────────────

export type PublicInvite = {
  event: {
    id: string;
    title: string;
    slug: string;
    eventDate: Date;
    timezone: string;
    venueName: string | null;
    venueAddr: string | null;
    rsvpDeadline: Date | null;
    allowPlusOne: boolean;
  };
  blocks: InviteBlockView[];
};

/**
 * Приглашение по слагу — без персонализации и без гостя.
 *
 * Кешируется по тегу `event:{id}`: в день свадьбы блоки не меняются, а
 * приглашение открывают сотни раз. Взято `unstable_cache`, а не `use cache`:
 * директива требует включить `cacheComponents` на всё приложение, а это
 * отдельная миграция — панель организатора и вход по QR писались до неё.
 *
 * Слаг уникален внутри организации, а не глобально: две организации могут
 * назвать мероприятие `ivanovy`. Публичная ссылка ведёт на опубликованное —
 * при совпадении берётся ближайшее по дате. Именная ссылка этой
 * неоднозначности не подвержена: она находит мероприятие по токену гостя.
 */
async function loadInviteBySlug(slug: string): Promise<PublicInvite | null> {
  const event = await db.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    orderBy: { eventDate: "asc" },
    select: {
      id: true, title: true, slug: true, eventDate: true, timezone: true,
      venueName: true, venueAddr: true, rsvpDeadline: true, allowPlusOne: true,
    },
  });
  if (!event) return null;

  const blocks = await db.inviteBlock.findMany({
    where: { eventId: event.id, visible: true },
    orderBy: { order: "asc" },
  });

  return { event, blocks: blocks.map(toView) };
}

/**
 * Кеш Next сериализует значение в JSON, и `Date` возвращается СТРОКОЙ.
 * Типы при этом остаются `Date` — TypeScript ничего не замечает, а
 * `Intl.DateTimeFormat().formatToParts("2026-09-19T...")` падает
 * с `RangeError: Invalid time value` уже в рантайме. Поэтому даты
 * оживляются здесь, на выходе из кеша, а не в каждом месте, где их печатают.
 */
function reviveDates(invite: PublicInvite | null): PublicInvite | null {
  if (!invite) return null;
  return {
    ...invite,
    event: {
      ...invite.event,
      eventDate: new Date(invite.event.eventDate),
      rsvpDeadline: invite.event.rsvpDeadline ? new Date(invite.event.rsvpDeadline) : null,
    },
  };
}

export async function getInviteBySlug(slug: string): Promise<PublicInvite | null> {
  const cached = await unstable_cache(() => loadInviteBySlug(slug), ["invite-by-slug", slug], {
    tags: [inviteCacheTag(slug)],
    revalidate: 60,
  })();
  return reviveDates(cached);
}

/** Блоки конкретного мероприятия — для именной страницы, где гость уже найден. */
export function getInviteBlocks(eventId: string): Promise<InviteBlockView[]> {
  return unstable_cache(
    async () => {
      const blocks = await db.inviteBlock.findMany({
        where: { eventId, visible: true },
        orderBy: { order: "asc" },
      });
      return blocks.map(toView);
    },
    ["invite-blocks", eventId],
    { tags: [eventCacheTag(eventId)], revalidate: 60 },
  )();
}
