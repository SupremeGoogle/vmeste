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
import { defaultContent, parseBlockContent, readBlockContent, PERMANENT_BLOCKS, SINGLE_BLOCKS } from "@/lib/invite-blocks";
import { eventTag as eventCacheTag, inviteSlugTag as inviteCacheTag } from "@/lib/cache-tags";
import type { AnyBlockContent } from "@/lib/invite-blocks";
import { inviteThemeSchema, readTheme, type InviteTheme } from "@/lib/invite-theme";
import { findTemplate, liveTheme, templateBlocks, templateTheme } from "@/lib/invite-templates";
import { parseLang } from "@/lib/i18n";
import { refreshBlocksFromTemplate } from "@/lib/invite-template-merge";
import { photoAdjustmentSchema, weddingSchema, type WeddingProfile } from "@/lib/invite-personalization";
import { resolveVenueMapUrl } from "@/server/geocode";
import { TEMPLATE_LABEL_OWNER } from "@/server/guest-html/template-labels";
import { readSnapshot } from "@/server/repositories/invite-draft";

/**
 * Что видят гости: снимок `publishedInvite` (см. invite-draft.ts), а без
 * него — живые строки. Редактор этим не пользуется: он правит черновик.
 */
async function guestBlocks(eventId: string, snapshotRaw: unknown): Promise<InviteBlockView[]> {
  const snapshot = readSnapshot(snapshotRaw);
  if (snapshot) return snapshot.blocks.filter((block) => block.visible).map(toView);
  const rows = await db.inviteBlock.findMany({ where: { eventId, visible: true }, orderBy: { order: "asc" } });
  return rows.map(toView);
}
const guestThemeSource = (event: { inviteTheme: unknown; publishedInvite: unknown }) => readSnapshot(event.publishedInvite)?.theme ?? event.inviteTheme;

function readEventTheme(event: { inviteTheme: unknown; venueName: string | null; venueAddr: string | null; rsvpDeadline: Date | null } | null): InviteTheme {
  const theme = liveTheme(readTheme(event?.inviteTheme));
  if (theme.wedding && event) theme.wedding = { ...theme.wedding, venueName: event.venueName ?? "", venueAddress: event.venueAddr ?? "", deadline: event.rsvpDeadline?.toISOString() ?? "" };
  return theme;
}

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

/** Один блок с проверкой принадлежности мероприятию. */
export async function getBlock(ctx: EventContext, blockId: string): Promise<InviteBlockView | null> {
  const row = await db.inviteBlock.findFirst({
    where: { id: blockId, eventId: ctx.eventId },
  });
  return row ? toView(row) : null;
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
  const saved = withMapUrl(content, await syncWeddingFields(ctx, content));
  const updated = await db.inviteBlock.updateMany({
    where: { id: blockId, eventId: ctx.eventId },
    data: { content: saved },
  });
  return updated.count === 1;
}

/** Сохранить надпись шаблона (`label:<ключ>`) в теме мероприятия. */
async function saveTemplateLabel(ctx: EventContext, path: string, value: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = path.startsWith("label:") ? path.slice(6) : "";
  if (!/^[a-z0-9][a-z0-9.-]{0,59}$/.test(key)) return { ok: false, message: "Эту надпись нельзя менять" };
  const text = value.trim().slice(0, 300);
  const saved = await updateTheme(ctx, (theme) => ({ ...theme, labels: { ...(theme.labels ?? {}), [key]: text } }));
  return saved ? { ok: true } : { ok: false, message: "Надпись не сохранилась" };
}

const INLINE_FIELDS: Record<BlockType, RegExp> = {
  COVER: /^(title|names|dateText|subtitle|imageUrl|footer|photos\.[0-3]\.(?:imageUrl|caption))$/,
  TEXT: /^(tag|title|text)$/,
  PHOTOS: /^(tag|title|items\.(?:0|1|2|3)\.(?:imageUrl|caption))$/,
  VENUE: /^(tag|title|name|address|note|imageUrl|mapUrl|mapLabel)$/,
  TIMELINE: /^(tag|title|items\.(?:[0-9]|[12][0-9])\.(?:time|title|note|icon))$/,
  DRESSCODE: /^(tag|title|text|imageUrl|palette\.[0-7])$/,
  RSVP_FORM: /^(tag|title|text|buttonLabel|nameLabel|attendanceLabel|yesLabel|noLabel|drinksLabel|musicLabel|musicPlaceholder|successText)$/,
  MAP: /^(title|note|yandexUrl|googleUrl)$/,
  CALENDAR: /^(tag|title|message)$/,
  COUNTDOWN: /^(title|doneText)$/,
  WISHLIST: /^(tag|title|text|openLabel|buttonLabel|envelopeTitle)$/,
};

/** Update one safe field from the on-page editor, then validate the whole block. */
export async function updateInlineBlockField(
  ctx: EventContext,
  blockId: string,
  path: string,
  value: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (path.startsWith("component:")) {
    const key = path.slice(10);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,119}$/.test(key) || !["remove", "restore"].includes(value)) return { ok: false, message: "Элемент не найден" };
    if (blockId !== TEMPLATE_LABEL_OWNER && !await getBlock(ctx, blockId)) return { ok: false, message: "Раздел не найден" };
    const saved = await updateTheme(ctx, (theme) => {
      const removedComponents = { ...theme.removedComponents };
      const keys = new Set(removedComponents[blockId] ?? []);
      if (value === "remove") keys.add(key); else keys.delete(key);
      if (keys.size) removedComponents[blockId] = [...keys]; else delete removedComponents[blockId];
      return { ...theme, removedComponents };
    });
    return saved ? { ok: true } : { ok: false, message: "Не удалось сохранить элемент" };
  }
  // Надпись самого шаблона, а не раздела: хранится в теме мероприятия.
  if (blockId === TEMPLATE_LABEL_OWNER) return saveTemplateLabel(ctx, path, value);
  const row = await db.inviteBlock.findFirst({
    where: { id: blockId, eventId: ctx.eventId },
    select: { type: true, content: true },
  });
  if (!row) return { ok: false, message: "Раздел не найден" };
  if (!INLINE_FIELDS[row.type].test(path)) return { ok: false, message: "Это поле нельзя менять на странице" };

  const parsedCurrent = readBlockContent(row.type, row.content).content;
  const next = JSON.parse(JSON.stringify(parsedCurrent)) as Record<string, unknown>;
  const parts = path.split(".");
  let cursor: Record<string, unknown> | unknown[] = next;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    let child = Array.isArray(cursor) ? cursor[Number(key)] : cursor[key];
    // Пустой слот фотографии (второй полароид, которого ещё нет) редактор
    // показывает, и заполнить его должно быть можно: создаём запись, а
    // значения по умолчанию дольёт схема. Дырявых массивов не бывает —
    // только следующий по счёту элемент.
    if (child === undefined && Array.isArray(cursor) && Number(key) === cursor.length) {
      child = {};
      cursor.push(child);
    }
    if (!child || typeof child !== "object") return { ok: false, message: "Поле больше не существует" };
    cursor = child as Record<string, unknown> | unknown[];
  }
  const last = parts.at(-1)!;
  if (Array.isArray(cursor)) cursor[Number(last)] = value;
  else cursor[last] = value;

  const checked = parseBlockContent(row.type, next);
  if (!checked.ok) return checked;
  if (path === "dateText" && (await getTheme(ctx)).wedding) return { ok: false, message: "Дату и город измените в панели «Имена, дата и место» — нажмите на дату." };
  const saved = withMapUrl(checked.content, await syncWeddingFields(ctx, checked.content, path));
  const updated = await db.inviteBlock.updateMany({
    where: { id: blockId, eventId: ctx.eventId },
    data: { content: saved },
  });
  return updated.count === 1 ? { ok: true } : { ok: false, message: "Не получилось сохранить" };
}

/** Add one editable row to the visual timeline editor. */
export async function appendTimelineItem(
  ctx: EventContext,
  blockId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await db.inviteBlock.findFirst({
    where: { id: blockId, eventId: ctx.eventId, type: "TIMELINE" },
    select: { content: true },
  });
  if (!row) return { ok: false, message: "Блок «Этот день» не найден" };

  const current = readBlockContent("TIMELINE", row.content).content;
  if (current.items.length >= 30) return { ok: false, message: "Можно добавить не больше 30 деталей" };
  const checked = parseBlockContent("TIMELINE", {
    ...current,
    items: [...current.items, { time: "", title: "Новая деталь", note: "Нажмите, чтобы изменить" }],
  });
  if (!checked.ok) return checked;
  const updated = await db.inviteBlock.updateMany({
    where: { id: blockId, eventId: ctx.eventId },
    data: { content: checked.content },
  });
  return updated.count === 1 ? { ok: true } : { ok: false, message: "Не получилось добавить деталь" };
}

/** Удалить одну строку тайминга из визуального редактора. */
export async function removeTimelineItem(
  ctx: EventContext,
  blockId: string,
  index: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!Number.isInteger(index) || index < 0 || index > 29) {
    return { ok: false, message: "Деталь дня не найдена" };
  }
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${ctx.eventId} FOR UPDATE`;
    const row = await tx.inviteBlock.findFirst({
      where: { id: blockId, eventId: ctx.eventId, type: "TIMELINE" },
      select: { content: true },
    });
    if (!row) return { ok: false, message: "Блок тайминга не найден" };

    const current = readBlockContent("TIMELINE", row.content).content;
    if (!current.items[index]) return { ok: false, message: "Деталь дня уже удалена" };
    const checked = parseBlockContent("TIMELINE", {
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    });
    if (!checked.ok) return checked;
    const updated = await tx.inviteBlock.updateMany({
      where: { id: blockId, eventId: ctx.eventId },
      data: { content: checked.content },
    });
    if (updated.count === 1) {
      const event = await tx.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { inviteTheme: true } });
      const theme = readTheme(event?.inviteTheme);
      const removed = theme.removedComponents?.[blockId];
      if (removed?.length) {
        const shifted = removed.flatMap(key => {
          const match = key.match(/^(field|decor|row):items\.(\d+)([.:].*)?$/);
          if (!match) return [key];
          const item = Number(match[2]);
          return item === index ? [] : [`${match[1]}:items.${item > index ? item - 1 : item}${match[3] ?? ""}`];
        });
        await tx.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { inviteTheme: { ...theme, removedComponents: { ...theme.removedComponents, [blockId]: shifted } } } });
      }
    }
    return updated.count === 1 ? { ok: true } : { ok: false, message: "Не получилось удалить деталь" };
  });
}

export async function setBlockVisible(ctx: EventContext, blockId: string, visible: boolean) {
  await db.inviteBlock.updateMany({
    where: { id: blockId, eventId: ctx.eventId },
    data: { visible },
  });
  // Виш-лист в приглашении и «показывать гостям виш-лист» — одно и то же:
  // по флагу мероприятия работают бронь подарка и страница гостя.
  const block = await db.inviteBlock.findFirst({ where: { id: blockId, eventId: ctx.eventId }, select: { type: true } });
  if (block?.type === "WISHLIST") await setWishlistShown(ctx, visible);
}

/** Показать или спрятать виш-лист: флаг мероприятия и раздел приглашения разом. */
export async function setWishlistShown(ctx: EventContext, shown: boolean) {
  await db.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { giftsEnabled: shown } });
  await db.inviteBlock.updateMany({ where: { eventId: ctx.eventId, type: "WISHLIST" }, data: { visible: shown } });
}

export async function deleteBlock(ctx: EventContext, blockId: string) {
  const block = await db.inviteBlock.findFirst({ where: { id: blockId, eventId: ctx.eventId }, select: { type: true } });
  await db.$transaction(async (tx) => {
    await tx.inviteBlock.deleteMany({ where: { id: blockId, eventId: ctx.eventId } });
    await renumber(tx, ctx.eventId);
  });
  // Нет раздела — нет и брони подарков: иначе гости бронировали бы по старой ссылке.
  if (block?.type === "WISHLIST") await setWishlistShown(ctx, false);
}

/**
 * Можно ли так поступить с разделом (стандарт, §12): одиночный раздел не
 * копируется и не добавляется второй раз, обложка не удаляется и не прячется.
 * `null` — можно.
 */
export async function blockActionProblem(
  ctx: EventContext,
  action: string,
  blockId: string,
  type?: BlockType,
): Promise<string | null> {
  if (action === "insert-after") {
    if (!type || !SINGLE_BLOCKS.includes(type)) return null;
    const exists = await db.inviteBlock.count({ where: { eventId: ctx.eventId, type } });
    return exists ? "Такой раздел уже есть — он может быть только один. Покажите его, если он скрыт." : null;
  }
  if (action !== "duplicate" && action !== "delete" && action !== "hide") return null;
  const block = await db.inviteBlock.findFirst({ where: { id: blockId, eventId: ctx.eventId }, select: { type: true } });
  if (!block) return "Раздел не найден — обновите страницу";
  if (action === "duplicate" && SINGLE_BLOCKS.includes(block.type)) return "Этот раздел может быть только один";
  if (action !== "duplicate" && PERMANENT_BLOCKS.includes(block.type)) return "Обложку можно изменить, но не убрать: на ней имена пары";
  return null;
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

/** Поставить раздел на позицию `index` — перетаскивание в списке разделов. */
export async function moveBlockTo(ctx: EventContext, blockId: string, index: number) {
  await db.$transaction(async (tx) => {
    const ids = (
      await tx.inviteBlock.findMany({ where: { eventId: ctx.eventId }, orderBy: { order: "asc" }, select: { id: true } })
    ).map((b) => b.id);
    const from = ids.indexOf(blockId);
    if (from === -1) return;
    ids.splice(from, 1);
    ids.splice(Math.max(0, Math.min(ids.length, Math.floor(index))), 0, blockId);
    await renumber(tx, ctx.eventId, ids);
  });
}

/**
 * Новый раздел сразу после `afterId` (или в начало, если его нет) — кнопка
 * «+ Добавить раздел» между разделами, как в конструкторах сайтов.
 */
export async function insertBlockAfter(ctx: EventContext, type: BlockType, afterId: string | null) {
  return db.$transaction(async (tx) => {
    const ids = (
      await tx.inviteBlock.findMany({ where: { eventId: ctx.eventId }, orderBy: { order: "asc" }, select: { id: true } })
    ).map((b) => b.id);
    const created = await tx.inviteBlock.create({
      data: { orgId: ctx.orgId, eventId: ctx.eventId, type, order: -100000 - ids.length, content: defaultContent(type) },
      select: { id: true },
    });
    const at = afterId ? ids.indexOf(afterId) + 1 : 0;
    ids.splice(at < 0 ? ids.length : at, 0, created.id);
    await renumber(tx, ctx.eventId, ids);
    return created.id;
  }).then(async (id) => {
    // Добавленный виш-лист сразу виден — значит, и бронь подарков открыта.
    if (type === "WISHLIST") await setWishlistShown(ctx, true);
    return id;
  });
}

/** Копия раздела со всем содержимым — встаёт сразу под оригиналом. */
export async function duplicateBlock(ctx: EventContext, blockId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${ctx.eventId} FOR UPDATE`;
    const source = await tx.inviteBlock.findFirst({
      where: { id: blockId, eventId: ctx.eventId },
      select: { type: true, content: true, visible: true },
    });
    if (!source) return null;
    const ids = (
      await tx.inviteBlock.findMany({ where: { eventId: ctx.eventId }, orderBy: { order: "asc" }, select: { id: true } })
    ).map((b) => b.id);
    const created = await tx.inviteBlock.create({
      data: {
        orgId: ctx.orgId, eventId: ctx.eventId, type: source.type, visible: source.visible,
        order: -100000 - ids.length, content: source.content as object,
      },
      select: { id: true },
    });
    ids.splice(ids.indexOf(blockId) + 1, 0, created.id);
    await renumber(tx, ctx.eventId, ids);
    const event = await tx.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { inviteTheme: true } });
    const theme = readTheme(event?.inviteTheme);
    const removed = theme.removedComponents?.[blockId];
    if (removed?.length) await tx.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { inviteTheme: { ...theme, removedComponents: { ...theme.removedComponents, [created.id]: [...removed] } } } });
    return created.id;
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
    /** Язык гостевой части: "ru" | "en". */
    language: string;
  };
  blocks: InviteBlockView[];
  /** Оформление. Читается терпимо: мусор в базе не должен ронять страницу. */
  theme: InviteTheme;
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
      language: true, inviteTheme: true, publishedInvite: true,
    },
  });
  if (!event) return null;

  const blocks = await guestBlocks(event.id, event.publishedInvite);
  const { inviteTheme, publishedInvite, ...rest } = event;
  return { event: rest, blocks, theme: readEventTheme({ ...rest, inviteTheme: guestThemeSource({ inviteTheme, publishedInvite }) }) };
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

/**
 * Оформление мероприятия для гостевых страниц. Кешируется вместе с
 * блоками и по тому же тегу: тема меняется ровно там же, где блоки, —
 * в панели, и сбрасывается одним действием.
 */
export function getInviteTheme(eventId: string): Promise<InviteTheme> {
  return unstable_cache(
    async () => {
      const event = await db.event.findFirst({
        where: { id: eventId },
        select: { inviteTheme: true, publishedInvite: true, venueName: true, venueAddr: true, rsvpDeadline: true },
      });
      return readEventTheme(event ? { ...event, inviteTheme: guestThemeSource(event) } : null);
    },
    ["invite-theme", eventId],
    { tags: [eventCacheTag(eventId)], revalidate: 60 },
  )();
}

/** Блоки конкретного мероприятия — для именной страницы, где гость уже найден. */
export function getInviteBlocks(eventId: string): Promise<InviteBlockView[]> {
  return unstable_cache(
    async () => {
      const event = await db.event.findFirst({ where: { id: eventId }, select: { publishedInvite: true } });
      return guestBlocks(eventId, event?.publishedInvite);
    },
    ["invite-blocks", eventId],
    { tags: [eventCacheTag(eventId)], revalidate: 60 },
  )();
}

// ────────────────────────────────────────────────────────────
// Оформление
// ────────────────────────────────────────────────────────────

/** Тема мероприятия для панели. Всегда возвращает пригодную к работе. */
export async function getTheme(ctx: EventContext): Promise<InviteTheme> {
  const event = await db.event.findFirst({
    where: { id: ctx.eventId, orgId: ctx.orgId },
    select: { inviteTheme: true, venueName: true, venueAddr: true, rsvpDeadline: true },
  });
  return readEventTheme(event);
}

/**
 * Изменить тему атомарно: строка мероприятия заблокирована, пока тема
 * читается и пишется. Подписи, цвета, заставка и музыка сохраняются по
 * одному полю, и при редакторе, открытом в двух вкладках, «прочитать всё —
 * записать всё» молча затирало бы соседнее изменение. `null` — изменение
 * не прошло проверку схемы.
 */
export async function updateTheme(ctx: EventContext, change: (theme: InviteTheme) => unknown): Promise<InviteTheme | null> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${ctx.eventId} FOR UPDATE`;
    const event = await tx.event.findFirst({
      where: { id: ctx.eventId, orgId: ctx.orgId },
      select: { inviteTheme: true, venueName: true, venueAddr: true, rsvpDeadline: true },
    });
    if (!event) return null;
    const parsed = inviteThemeSchema.safeParse(change(readEventTheme(event)));
    if (!parsed.success) return null;
    await tx.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { inviteTheme: parsed.data } });
    return parsed.data;
  });
}

/** Сохранение темы. Значения приходят уже проверенными схемой. */
export async function saveTheme(ctx: EventContext, theme: InviteTheme): Promise<boolean> {
  const result = await db.event.updateMany({
    where: { id: ctx.eventId, orgId: ctx.orgId },
    data: { inviteTheme: theme },
  });
  return result.count === 1;
}

/**
 * Применение шаблона: тема плюс стартовый набор блоков.
 *
 * Прежние блоки удаляются целиком, а не дополняются. Это выглядит грубо,
 * но альтернатива хуже: приглашение, в котором две обложки и два
 * расписания, человек будет разбирать руками, ругаясь на нас. Панель
 * предупреждает об этом перед нажатием, и шаблон меняют один раз в начале.
 *
 * Всё одной транзакцией: половина применённого шаблона — это приглашение,
 * которое уже нельзя показать и ещё нельзя починить.
 */
/** Данные свадьбы по умолчанию — из того, что ввели при её создании. */
function seedWedding(event: { title?: string | null; venueName?: string | null; venueAddr?: string | null }): WeddingProfile | undefined {
  const names = String(event.title ?? "").replace(/\s*[—–-]\s*(?:свадьба|wedding)\s*$/i, "").trim().slice(0, 120);
  const parsed = weddingSchema.safeParse({ names, city: "", venueName: event.venueName ?? "", venueAddress: event.venueAddr ?? "", mapUrl: "" });
  return parsed.success ? parsed.data : undefined;
}

export async function applyTemplate(ctx: EventContext, templateId: string, reset = false): Promise<boolean> {
  const template = findTemplate(templateId);
  if (!template) return false;

  await db.$transaction(async (tx) => {
    const event = await tx.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { inviteTheme: true, title: true, venueName: true, venueAddr: true, language: true } });
    const current = readTheme(event?.inviteTheme);
    // Образец — на языке гостей этой свадьбы: английской достаётся английский.
    const lang = parseLang(event?.language) ?? current.language ?? "ru";
    const sampleBlocks = templateBlocks(template, lang);
    const count = await tx.inviteBlock.count({ where: { eventId: ctx.eventId } });
    // Имена пары известны с создания свадьбы — с ними шаблон и открывается,
    // везде, включая заставку. Уточнить их можно в «Имена, дата и место».
    const wedding = current.wedding ?? (event ? seedWedding(event) : undefined);
    const nextTheme = { ...templateTheme(template, lang), templateVersion: template.version ?? 1, musicUrl: current.musicUrl, ...(wedding ? { wedding } : {}), ...(!reset && current.removedComponents ? { removedComponents: current.removedComponents } : {}), previousTemplate: current.template };
    if (count && !reset) {
      // Блоки остаются, но места, где так и стоит пример прежнего шаблона,
      // получают пример нового — иначе выбранный дизайн открывается пустым
      // и непохожим на свой образец. Своё организатора не трогается.
      const blocks = await tx.inviteBlock.findMany({
        where: { eventId: ctx.eventId, orgId: ctx.orgId },
        orderBy: { order: "asc" },
        select: { id: true, type: true, content: true },
      });
      for (const change of refreshBlocksFromTemplate(blocks, template, lang)) {
        await tx.inviteBlock.updateMany({
          where: { id: change.id, eventId: ctx.eventId, orgId: ctx.orgId },
          data: { content: change.content as object },
        });
      }
      await tx.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { inviteTheme: nextTheme } });
      return;
    }
    await tx.inviteBlock.deleteMany({ where: { eventId: ctx.eventId } });

    // Порядок создаём явным, а не полагаемся на порядок вставки: на
    // `@@unique([eventId, order])` любая неожиданность стоит дорого.
    for (const [index, block] of sampleBlocks.entries()) {
      await tx.inviteBlock.create({
        data: {
          orgId: ctx.orgId,
          eventId: ctx.eventId,
          type: block.type,
          order: index,
          visible: block.visible ?? true,
          content: block.content as object,
        },
      });
    }

    // Флаг виш-листа следует за его разделом: в новом приглашении он скрыт.
    await tx.event.updateMany({
      where: { id: ctx.eventId, orgId: ctx.orgId },
      data: { inviteTheme: nextTheme, giftsEnabled: sampleBlocks.some((block) => block.type === "WISHLIST" && block.visible !== false) },
    });
  });

  return true;
}

/** Точка на карте, найденная по адресу, — в сохраняемый блок «Место». */
function withMapUrl(content: AnyBlockContent, mapUrl: string | undefined): AnyBlockContent {
  return mapUrl !== undefined && "address" in content ? { ...content, mapUrl } : content;
}

/**
 * Canonical text edited inline must stay in sync with the shared wedding panel.
 * Для блока «Место» возвращает ссылку на карту, которую надо сохранить
 * (свою ссылку организатора или точку, найденную по адресу).
 */
async function syncWeddingFields(ctx: EventContext, content: AnyBlockContent, path?: string): Promise<string | undefined> {
  if (path && !["names", "name", "address", "mapUrl", "yandexUrl", "googleUrl"].includes(path)) return undefined;
  if (!("names" in content) && !("address" in content) && !("yandexUrl" in content)) return undefined;
  const theme = await getTheme(ctx);
  if (!theme.wedding) return undefined;
  const w = { ...theme.wedding };
  if ("names" in content) w.names = content.names || w.names;
  if ("address" in content) {
    const mapUrl = await resolveVenueMapUrl(
      { mapUrl: content.mapUrl, name: content.name, address: content.address },
      { name: w.venueName, address: w.venueAddress },
    );
    Object.assign(w, { venueName: content.name, venueAddress: content.address, mapUrl });
  }
  if ("yandexUrl" in content) w.mapUrl = content.yandexUrl || content.googleUrl;
  const parsed = weddingSchema.safeParse(w);
  if (!parsed.success) return undefined;
  await db.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { inviteTheme: { ...theme, wedding: parsed.data }, venueName: w.venueName, venueAddr: w.venueAddress } });
  // Найденная точка нужна и в «Как добраться»; сам блок «Место» сохранит
  // вызывающий код — он пишет его целиком.
  if ("address" in content && parsed.data.mapUrl !== content.mapUrl) {
    const maps = await db.inviteBlock.findMany({ where: { eventId: ctx.eventId, type: "MAP" } });
    for (const block of maps) {
      const next = { ...readBlockContent("MAP", block.content).content, yandexUrl: parsed.data.mapUrl, googleUrl: "" };
      const ok = parseBlockContent("MAP", next);
      if (ok.ok) await db.inviteBlock.updateMany({ where: { eventId: ctx.eventId, id: block.id }, data: { content: ok.content } });
    }
  }
  return "address" in content ? parsed.data.mapUrl : undefined;
}

export async function savePhotoAdjustment(ctx: EventContext, blockId: string, path: string, raw: unknown, url: string) {
  const adjustment = photoAdjustmentSchema.safeParse(raw);
  if (!adjustment.success || !/^(imageUrl|(?:items|photos)\.[0-3]\.imageUrl)$/.test(path)) return { ok: false as const, message: "Некорректные настройки фотографии" };
  const block = await getBlock(ctx, blockId);
  if (!block || !["COVER", "VENUE", "PHOTOS", "DRESSCODE"].includes(block.type)) return { ok: false as const, message: "Фотография не найдена" };
  if (!INLINE_FIELDS[block.type].test(path)) return { ok: false as const, message: "Это не поле фотографии" };
  const current = JSON.parse(JSON.stringify(block.content)) as Record<string, unknown> & { photoSettings?: Record<string, unknown> };
  const parts = path.split(".");
  if (parts.length === 1) current.imageUrl = url;
  else {
    const list = current[parts[0]] as Record<string, unknown>[];
    const index = Number(parts[1]);
    if (!Array.isArray(list) || index > list.length) return { ok: false as const, message: "Сначала заполните предыдущую фотографию" };
    list[index] = { ...list[index], imageUrl: url };
  }
  const parsed = parseBlockContent(block.type, { ...current, photoSettings: { ...current.photoSettings, [path]: adjustment.data } });
  if (!parsed.ok) return parsed;
  const updated = await db.inviteBlock.updateMany({ where: { eventId: ctx.eventId, id: blockId }, data: { content: parsed.content } });
  return updated.count ? { ok: true as const } : { ok: false as const, message: "Не удалось сохранить фотографию" };
}

export async function saveWeddingProfile(ctx: EventContext, raw: WeddingProfile, eventDate: Date, deadline: Date | null) {
  const wedding = weddingSchema.parse(raw);
  // Точка на карте ищется до транзакции: запрос к геокодеру — это сеть,
  // и держать ради него открытую транзакцию незачем.
  const before = readTheme((await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { inviteTheme: true } }))?.inviteTheme).wedding;
  wedding.mapUrl = await resolveVenueMapUrl(
    { mapUrl: wedding.mapUrl, name: wedding.venueName, address: wedding.venueAddress },
    before && { name: before.venueName, address: before.venueAddress },
  );
  await db.$transaction(async (tx) => {
    const event = await tx.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId } });
    if (!event) throw new Error("Мероприятие не найдено");
    const theme = readTheme(event.inviteTheme);
    await tx.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: {
      title: wedding.names, eventDate, rsvpDeadline: deadline, venueName: wedding.venueName, venueAddr: wedding.venueAddress,
      inviteTheme: { ...theme, wedding: { ...wedding, deadline: deadline?.toISOString() ?? "" } },
    } });
    const blocks = await tx.inviteBlock.findMany({ where: { eventId: ctx.eventId } });
    for (const block of blocks) {
      const c = readBlockContent(block.type, block.content).content;
      const next = { ...c } as Record<string, unknown>;
      if (block.type === "COVER") Object.assign(next, { names: wedding.names, dateText: "" });
      if (block.type === "VENUE") Object.assign(next, { name: wedding.venueName, address: wedding.venueAddress, mapUrl: wedding.mapUrl });
      if (block.type === "MAP") Object.assign(next, { yandexUrl: wedding.mapUrl, googleUrl: "" });
      const parsed = parseBlockContent(block.type, next);
      if (parsed.ok) await tx.inviteBlock.updateMany({ where: { eventId: ctx.eventId, id: block.id }, data: { content: parsed.content } });
    }
  });
}
