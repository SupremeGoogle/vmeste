/**
 * Черновик приглашения: гости видят снимок, а не живые правки.
 *
 *  — опубликовали → снимок; правка в редакторе гостям не видна;
 *  — «Сохранить изменения» — видна; «Отменить» — черновик как у гостей;
 *  — галочка виш-листа в настройках подарков действует на гостей сразу.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import type { EventContext } from "@/server/context";

vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: T) => fn,
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
}));

const { applyTemplate, getTheme, getInviteBlocks, getInviteTheme, updateInlineBlockField, listBlocks, updateTheme } = await import("@/server/repositories/invites");
const { discardDraft, getDraftState, saveSnapshot } = await import("@/server/repositories/invite-draft");
const { saveEnvelope } = await import("@/server/services/gifts");

let ctx: EventContext;

beforeEach(async () => {
  await resetDb();
  const org = await testDb.organization.create({ data: { name: "d", slug: "d" } });
  const event = await testDb.event.create({
    data: { orgId: org.id, title: "Аня и Миша", slug: "draft", shortCode: "DRAFTT", eventDate: new Date(Date.now() + 30 * 86_400_000) },
  });
  ctx = { orgId: org.id, eventId: event.id } as EventContext;
  expect(await applyTemplate(ctx, "pearl")).toBe(true);
});
afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

const coverTitle = async (blocks: Awaited<ReturnType<typeof getInviteBlocks>>) =>
  (blocks.find((block) => block.type === "COVER")?.content as { names?: string }).names;

describe("имена пары с создания свадьбы", () => {
  it("шаблон открывается сразу с именами из названия", async () => {
    expect((await getTheme(ctx)).wedding?.names).toBe("Аня и Миша");
  });
});

describe("черновик приглашения", () => {
  it("правка не видна гостям до «Сохранить», «Отменить» возвращает прошлую версию", async () => {
    // До публикации снимка нет — гостям живые строки, как раньше.
    expect((await getDraftState(ctx)).dirty).toBe(false);

    await testDb.event.update({ where: { id: ctx.eventId }, data: { status: "PUBLISHED" } });
    expect(await saveSnapshot(ctx)).toBe(true);
    const cover = (await listBlocks(ctx)).find((block) => block.type === "COVER")!;
    const before = await coverTitle(await getInviteBlocks(ctx.eventId));

    expect((await updateInlineBlockField(ctx, cover.id, "names", "Новые Имена")).ok).toBe(true);
    await updateTheme(ctx, (theme) => ({ ...theme, introOff: true }));
    expect((await getDraftState(ctx)).dirty).toBe(true);
    expect(await coverTitle(await getInviteBlocks(ctx.eventId))).toBe(before);
    expect((await getInviteTheme(ctx.eventId)).introOff).not.toBe(true);

    expect(await saveSnapshot(ctx)).toBe(true);
    expect((await getDraftState(ctx)).dirty).toBe(false);
    expect(await coverTitle(await getInviteBlocks(ctx.eventId))).toBe("Новые Имена");
    expect((await getInviteTheme(ctx.eventId)).introOff).toBe(true);

    expect((await updateInlineBlockField(ctx, cover.id, "names", "Передумали")).ok).toBe(true);
    expect((await getDraftState(ctx)).dirty).toBe(true);
    expect(await discardDraft(ctx)).toBe(true);
    expect((await getDraftState(ctx)).dirty).toBe(false);
    expect((await listBlocks(ctx)).find((block) => block.type === "COVER")?.content).toMatchObject({ names: "Новые Имена" });
  });

  it("галочка виш-листа действует на гостей без «Сохранить»", async () => {
    await testDb.event.update({ where: { id: ctx.eventId }, data: { status: "PUBLISHED" } });
    await saveSnapshot(ctx);
    await saveEnvelope(ctx, { enabled: true, label: "Подарок в конверте", details: "", url: "" });
    expect((await getInviteBlocks(ctx.eventId)).some((block) => block.type === "WISHLIST")).toBe(true);
    expect((await getDraftState(ctx)).dirty).toBe(false);
  });
});
