/**
 * Правила редактора приглашения (стандарт, §12) на настоящей базе.
 *
 *  — обложка, анкета, таймер и виш-лист бывают в одном экземпляре;
 *  — обложку нельзя удалить или спрятать: на ней имена пары;
 *  — раздел «Виш-лист» и бронь подарков включаются и выключаются вместе;
 *  — подписи шаблона, сохранённые одновременно (две вкладки), не теряются.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import type { EventContext } from "@/server/context";
import {
  applyTemplate, blockActionProblem, deleteBlock, duplicateBlock, getTheme, insertBlockAfter, listBlocks, removeTimelineItem,
  setBlockVisible, updateInlineBlockField, updateTheme,
} from "@/server/repositories/invites";
import { TEMPLATE_LABEL_OWNER } from "@/server/guest-html/template-labels";

async function makeCtx(slug: string): Promise<EventContext> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: { orgId: org.id, title: slug, slug, shortCode: Math.random().toString(36).slice(2, 8).toUpperCase(), eventDate: new Date("2027-07-11T14:00:00Z") },
  });
  const ctx = { kind: "org" as const, userId: "u1", orgId: org.id, role: "OWNER" as const, eventId: event.id } as EventContext;
  await applyTemplate(ctx, "silk");
  return ctx;
}

const giftsEnabled = async (ctx: EventContext) =>
  (await testDb.event.findUniqueOrThrow({ where: { id: ctx.eventId }, select: { giftsEnabled: true } })).giftsEnabled;

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("одиночные разделы и обложка", () => {
  it("вторую обложку, анкету, таймер и виш-лист не добавить и не скопировать", async () => {
    const ctx = await makeCtx("rules-single");
    const blocks = await listBlocks(ctx);
    for (const type of ["COVER", "RSVP_FORM", "COUNTDOWN", "WISHLIST"] as const) {
      expect(await blockActionProblem(ctx, "insert-after", "", type)).toMatch(/только один/);
      const block = blocks.find((item) => item.type === type)!;
      expect(await blockActionProblem(ctx, "duplicate", block.id)).toMatch(/только один/);
    }
    // Обычные разделы — сколько угодно.
    const text = blocks.find((item) => item.type === "TEXT")!;
    expect(await blockActionProblem(ctx, "duplicate", text.id)).toBeNull();
    expect(await blockActionProblem(ctx, "insert-after", text.id, "PHOTOS")).toBeNull();
  });

  it("обложку нельзя удалить или спрятать, остальное — можно", async () => {
    const ctx = await makeCtx("rules-cover");
    const blocks = await listBlocks(ctx);
    const cover = blocks.find((item) => item.type === "COVER")!;
    expect(await blockActionProblem(ctx, "delete", cover.id)).toMatch(/Обложку/);
    expect(await blockActionProblem(ctx, "hide", cover.id)).toMatch(/Обложку/);
    expect(await blockActionProblem(ctx, "up", cover.id)).toBeNull();
    const venue = blocks.find((item) => item.type === "VENUE")!;
    expect(await blockActionProblem(ctx, "delete", venue.id)).toBeNull();
  });

  it("раздел чужого мероприятия не найти", async () => {
    const mine = await makeCtx("rules-mine");
    const other = await makeCtx("rules-other");
    const foreign = (await listBlocks(other)).find((item) => item.type === "TEXT")!;
    expect(await blockActionProblem(mine, "delete", foreign.id)).toMatch(/не найден/);
    expect(await duplicateBlock(mine, foreign.id)).toBeNull();
    await deleteBlock(mine, foreign.id);
    expect((await listBlocks(other)).some((item) => item.id === foreign.id)).toBe(true);
  });

  it("удалённый одиночный раздел можно вернуть — снова один", async () => {
    const ctx = await makeCtx("rules-readd");
    const countdown = (await listBlocks(ctx)).find((item) => item.type === "COUNTDOWN")!;
    await deleteBlock(ctx, countdown.id);
    expect(await blockActionProblem(ctx, "insert-after", "", "COUNTDOWN")).toBeNull();
    await insertBlockAfter(ctx, "COUNTDOWN", null);
    expect((await listBlocks(ctx)).filter((item) => item.type === "COUNTDOWN")).toHaveLength(1);
    expect(await blockActionProblem(ctx, "insert-after", "", "COUNTDOWN")).toMatch(/только один/);
  });
});

describe("виш-лист и бронь подарков — одно целое", () => {
  it("показать, спрятать, удалить и вернуть раздел — бронь следом", async () => {
    const ctx = await makeCtx("rules-wishlist");
    const wishlist = () => listBlocks(ctx).then((blocks) => blocks.find((item) => item.type === "WISHLIST"));
    // По стандарту виш-лист в новом приглашении выключен.
    expect((await wishlist())?.visible).toBe(false);
    expect(await giftsEnabled(ctx)).toBe(false);

    await setBlockVisible(ctx, (await wishlist())!.id, true);
    expect(await giftsEnabled(ctx)).toBe(true);

    await deleteBlock(ctx, (await wishlist())!.id);
    expect(await wishlist()).toBeUndefined();
    expect(await giftsEnabled(ctx)).toBe(false);

    await insertBlockAfter(ctx, "WISHLIST", null);
    expect((await wishlist())?.visible).toBe(true);
    expect(await giftsEnabled(ctx)).toBe(true);
  });
});

describe("тема меняется атомарно", () => {
  it("удалённый элемент остаётся у своего пункта после удаления предыдущего пункта программы", async () => {
    const ctx = await makeCtx("rules-components-shift");
    const timeline = (await listBlocks(ctx)).find(block => block.type === "TIMELINE")!;
    expect((await updateInlineBlockField(ctx, timeline.id, "component:field:items.1.note", "remove")).ok).toBe(true);
    expect((await updateInlineBlockField(ctx, timeline.id, "component:row:items.2", "remove")).ok).toBe(true);
    expect((await removeTimelineItem(ctx, timeline.id, 0)).ok).toBe(true);
    expect((await getTheme(ctx)).removedComponents?.[timeline.id]).toEqual(["field:items.0.note", "row:items.1"]);
    expect((await removeTimelineItem(ctx, timeline.id, 0)).ok).toBe(true);
    expect((await getTheme(ctx)).removedComponents?.[timeline.id]).toEqual(["row:items.0"]);
  });
  it("двадцать подписей, сохранённых одновременно, — все на месте", async () => {
    const ctx = await makeCtx("rules-labels");
    const keys = Array.from({ length: 20 }, (_, index) => `silk.t${index}`);
    const results = await Promise.all(keys.map((key, index) =>
      updateInlineBlockField(ctx, TEMPLATE_LABEL_OWNER, `label:${key}`, `Подпись ${index}`)));
    expect(results.every((result) => result.ok)).toBe(true);
    const labels = (await getTheme(ctx)).labels ?? {};
    for (const [index, key] of keys.entries()) expect(labels[key]).toBe(`Подпись ${index}`);
  });

  it("подпись и цвет одновременно — оба сохраняются", async () => {
    const ctx = await makeCtx("rules-mixed");
    await Promise.all([
      updateInlineBlockField(ctx, TEMPLATE_LABEL_OWNER, "label:silk.t1", "Своя подпись"),
      updateTheme(ctx, (theme) => ({ ...theme, style: { accent: "#1f5c4a" } })),
      updateTheme(ctx, (theme) => ({ ...theme, introOff: true })),
    ]);
    const theme = await getTheme(ctx);
    expect(theme.labels?.["silk.t1"]).toBe("Своя подпись");
    expect(theme.style?.accent).toBe("#1f5c4a");
    expect(theme.introOff).toBe(true);
  });

  it("недопустимые подписи не сохраняются", async () => {
    const ctx = await makeCtx("rules-badlabel");
    expect((await updateInlineBlockField(ctx, TEMPLATE_LABEL_OWNER, "label:../../etc", "x")).ok).toBe(false);
    expect((await updateInlineBlockField(ctx, TEMPLATE_LABEL_OWNER, "label:__proto__", "x")).ok).toBe(false);
    expect((await updateInlineBlockField(ctx, TEMPLATE_LABEL_OWNER, "label:silk.t1", "<script>alert(1)</script>".repeat(40))).ok).toBe(true);
    // Текст обрезан до 300 символов и хранится как текст — экранирует его вывод.
    expect((await getTheme(ctx)).labels?.["silk.t1"]).toHaveLength(300);
    expect(await updateTheme(ctx, (theme) => ({ ...theme, style: { accent: "red;}</style><script>" } }))).toBeNull();
  });
});
