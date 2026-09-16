/**
 * «Тили-тесто» и редактирование на странице.
 *
 * Проверяется то, что ломается незаметно: шаблон, не переживший схему
 * блоков; поле, которое в редакторе есть, а сохранить нельзя; анкета,
 * которая молча стирает выбор блюда или спутника; разметка редактора,
 * утёкшая на страницу гостя.
 */
import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import { readBlockContent } from "@/lib/invite-blocks";
import { findTemplate, INVITE_TEMPLATES } from "@/lib/invite-templates";
import { TILI_TEMPLATE } from "@/lib/invite-templates/tili";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import { applyTemplate, listBlocks, updateInlineBlockField } from "@/server/repositories/invites";
import { submitRsvp } from "@/server/services/rsvp";
import { normalizeName } from "@/lib/name-normalize";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { EventContext } from "@/server/context";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";

const DATE = new Date("2027-07-11T09:30:00Z");

function blocksOf(template = TILI_TEMPLATE): InviteBlockView[] {
  return template.blocks.map((block, index) => ({
    id: `b${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Тили-тесто: шаблон и гостевая страница", () => {
  it("зарегистрирован, и все блоки переживают схему без потерь", () => {
    expect(findTemplate("tili")).toBe(TILI_TEMPLATE);
    for (const block of TILI_TEMPLATE.blocks) {
      const parsed = readBlockContent(block.type, block.content);
      expect(parsed.degraded).toBe(false);
      expect(parsed.content).toMatchObject(block.content);
    }
  });

  it("рисует разделы образца: конверт, гирлянду, полароиды, календарь, тайминг, анкету", () => {
    const blocks = blocksOf();
    const page = invitePage({
      title: "Диана и Виктор",
      theme: TILI_TEMPLATE.theme,
      body: renderBlocks(blocks, null, null, DATE, TILI_TEMPLATE.theme, "Europe/Kaliningrad"),
      script: inviteScript(blocks, TILI_TEMPLATE.theme, "Диана и Виктор"),
    });

    for (const marker of [
      'id="cover"', 'class="bunting"', "тили ~ тили тесто", 'class="polaroid polaroid-left"',
      'class="cal-card', "Июль 2027", 'class="d d-marked">11<', "11 / 07 / 27",
      'id="countdown"', "Лермонтовская частная баня", 'class="tl-item', 'class="swatch"',
      'class="wishes-section"', 'id="rsvpForm"', "Диана &amp; Виктор", "msg-canvas",
    ]) {
      expect(page).toContain(marker);
    }
    // Шаблон собирает свой документ: общих стилей с теми же классами нет.
    expect(page).not.toContain('class="sheet');
    // Без именной ссылки анкета не отправляется никуда.
    expect(page).toContain('data-no-link="1"');
    // Разметка редактора на страницу гостя не попадает.
    expect(page).not.toContain("data-inline-edit");
    expect(page).not.toContain("ie-tools");
  });

  it("анкета по именной ссылке: имя, прежний ответ, напитки бара и всё, чего в ней нет", () => {
    const rsvp: TiliRsvp = {
      action: "/i/slug/token/rsvp",
      guestName: "Анна Петрова",
      status: "ACCEPTED",
      drinks: [{ id: "d1", title: "Вино" }, { id: "d2", title: "Сок" }],
      chosenDrinks: ["d2"],
      musicWish: "джаз",
      keep: { mealOptionId: "m1", comment: "без орехов", plusOneName: "Настя", plusOneMealOptionId: null, plusOneDrinkOptionIds: ["d1"] },
      saved: false,
      error: null,
    };
    const html = renderBlocks(blocksOf(), "/i/slug/token/rsvp", "придём", DATE, TILI_TEMPLATE.theme, "UTC", { rsvp });

    expect(html).toContain('action="/i/slug/token/rsvp"');
    expect(html).toContain('value="Анна Петрова" readonly');
    expect(html).toMatch(/value="ACCEPTED" required checked/);
    expect(html).toMatch(/value="d2" checked/);
    expect(html).not.toMatch(/value="d1" checked/);
    expect(html).toContain('value="джаз"');
    // Блюдо, комментарий и спутник уходят скрытыми полями — иначе стёрлись бы.
    expect(html).toContain('name="mealOptionId" value="m1"');
    expect(html).toContain('name="comment" value="без орехов"');
    expect(html).toContain('name="plusOneName" value="Настя"');
    expect(html).toContain('name="plusOneDrinkOptionIds" value="d1"');
    expect(html).not.toContain("data-no-link");
  });

  it("после отправки показывает благодарность вместо формы", () => {
    const rsvp: TiliRsvp = {
      action: "/x", guestName: "Гость", status: "ACCEPTED", drinks: [], chosenDrinks: [], musicWish: "",
      keep: { mealOptionId: null, comment: "", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      saved: true, error: null,
    };
    const html = renderBlocks(blocksOf(), "/x", "придём", DATE, TILI_TEMPLATE.theme, "UTC", { rsvp });
    expect(html).toContain('class="rsvp-success show"');
    expect(html).toMatch(/id="rsvpForm"[^>]*style="display:none"/);
  });

  it("музыка появляется только когда выбрана, и адрес не подменить чужим доменом", async () => {
    const { inviteThemeSchema } = await import("@/lib/invite-theme");
    const silent = renderBlocks(blocksOf(), null, null, DATE, TILI_TEMPLATE.theme);
    expect(silent).not.toContain("weddingMusic");

    const theme = { ...TILI_TEMPLATE.theme, musicUrl: "/api/asset/ev1/as1" };
    expect(renderBlocks(blocksOf(), null, null, DATE, theme)).toContain('<audio id="weddingMusic" src="/api/asset/ev1/as1"');

    expect(inviteThemeSchema.safeParse({ musicUrl: "https://evil.example/x.mp3" }).success).toBe(false);
    expect(inviteThemeSchema.safeParse({ musicUrl: "//evil.example/x.mp3" }).success).toBe(false);
  });

  it("экранирует текст организатора", () => {
    const blocks = blocksOf();
    (blocks[0].content as { names: string }).names = '<img src=x onerror="alert(1)"> и Виктор';
    const html = renderBlocks(blocks, null, null, DATE, TILI_TEMPLATE.theme);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });
});

describe("редактирование на странице во всех шаблонах", () => {
  it("каждый шаблон в режиме редактора размечает поля и разделы, а для гостя — нет", () => {
    for (const template of INVITE_TEMPLATES) {
      const blocks = blocksOf(template);
      const editing = renderBlocks(blocks, null, null, DATE, template.theme, "UTC", { editable: true });
      const guest = renderBlocks(blocks, null, null, DATE, template.theme, "UTC");

      expect(editing, template.id).toContain("data-inline-edit");
      expect(editing, template.id).toContain("data-block-action");
      // Каждый видимый раздел можно двигать и скрывать.
      for (const block of blocks) {
        if (block.type === "COUNTDOWN" && !editing.includes(`data-block-id="${block.id}"`)) continue;
        expect(editing, `${template.id}: ${block.type}`).toContain(`data-block-id="${block.id}"`);
      }
      expect(guest, template.id).not.toContain("data-inline-edit");
      expect(guest, template.id).not.toContain("data-block-action");
    }
  });

  it("в «Тили-тесто» можно править подписи фото, цвета палитры и ссылку карты", () => {
    const html = renderBlocks(blocksOf(), null, null, DATE, TILI_TEMPLATE.theme, "UTC", { editable: true });
    expect(html).toContain('data-path="photos.0.caption"');
    expect(html).toContain('data-path="photos.1.imageUrl"');
    expect(html).toContain('data-color-edit data-block-id="b6" data-path="palette.0"');
    expect(html).toContain('data-link-edit data-block-id="b4" data-path="mapUrl"');
    expect(html).toContain('data-path="items.3.icon"');
    expect(html).toContain('data-path="yesLabel"');
    // В редакторе конверта нет — иначе страницу не видно.
    expect(html).not.toContain('id="cover"');
  });
});

describe("сохранение поля со страницы", () => {
  let ctx: EventContext;

  beforeEach(async () => {
    await resetDb();
    const org = await testDb.organization.create({ data: { name: "tili", slug: "tili" } });
    const event = await testDb.event.create({
      data: { orgId: org.id, title: "Свадьба", slug: "tili", shortCode: "TILIAA", eventDate: DATE },
    });
    ctx = { kind: "org", userId: "u", orgId: org.id, role: "OWNER", eventId: event.id };
    await applyTemplate(ctx, "tili");
  });

  afterAll(async () => {
    await resetDb();
    await testDb.$disconnect();
  });

  const byType = async (type: string) => (await listBlocks(ctx)).find((block) => block.type === type)!;

  it("сохраняет новые поля: подпись полароида, цвет, надпись анкеты, ссылку карты", async () => {
    const cover = await byType("COVER");
    const dress = await byType("DRESSCODE");
    const rsvp = await byType("RSVP_FORM");
    const venue = await byType("VENUE");

    expect(await updateInlineBlockField(ctx, cover.id, "photos.1.caption", "— и это я")).toEqual({ ok: true });
    expect(await updateInlineBlockField(ctx, dress.id, "palette.2", "#112233")).toEqual({ ok: true });
    expect(await updateInlineBlockField(ctx, rsvp.id, "yesLabel", "Буду!")).toEqual({ ok: true });
    expect(await updateInlineBlockField(ctx, venue.id, "mapUrl", "https://yandex.ru/maps/x")).toEqual({ ok: true });

    expect((await byType("COVER")).content).toMatchObject({ photos: [{}, { caption: "— и это я" }] });
    expect(((await byType("DRESSCODE")).content as { palette: string[] }).palette[2]).toBe("#112233");
    expect((await byType("RSVP_FORM")).content).toMatchObject({ yesLabel: "Буду!" });
  });

  it("не пропускает чужую схему: ссылку javascript:, кривой цвет, неизвестное поле", async () => {
    const venue = await byType("VENUE");
    const dress = await byType("DRESSCODE");
    expect((await updateInlineBlockField(ctx, venue.id, "mapUrl", "javascript:alert(1)")).ok).toBe(false);
    expect((await updateInlineBlockField(ctx, dress.id, "palette.0", "red;background:url(x)")).ok).toBe(false);
    expect((await updateInlineBlockField(ctx, venue.id, "v", "9")).ok).toBe(false);
  });

  it("второй снимок можно добавить в пустой слот, но не через дыру", async () => {
    const photos = await byType("PHOTOS");
    await testDb.inviteBlock.update({
      where: { id: photos.id },
      data: { content: { v: 1, title: "", items: [{ imageUrl: "", caption: "один" }] } },
    });
    expect(await updateInlineBlockField(ctx, photos.id, "items.1.caption", "два")).toEqual({ ok: true });
    expect((await updateInlineBlockField(ctx, photos.id, "items.3.caption", "дыра")).ok).toBe(false);
  });
});

describe("анкета «Тили-тесто»: ответ про музыку", () => {
  afterAll(async () => {
    await resetDb();
    await testDb.$disconnect();
  });

  it("сохраняет пожелание, а форма без вопроса его не стирает", async () => {
    await resetDb();
    const org = await testDb.organization.create({ data: { name: "m", slug: "m" } });
    const event = await testDb.event.create({
      data: { orgId: org.id, title: "Свадьба", slug: "m", shortCode: "MUSICA", eventDate: DATE },
    });
    const token = randomBytes(16).toString("base64url");
    const guest = await testDb.guest.create({
      data: {
        orgId: org.id, eventId: event.id, displayName: "Анна", searchKey: normalizeName("Анна"), linkToken: token,
      },
    });

    await submitRsvp(token, { status: "ACCEPTED", musicWish: "  Меладзе " });
    expect((await testDb.guest.findUniqueOrThrow({ where: { id: guest.id } })).musicWish).toBe("Меладзе");

    await submitRsvp(token, { status: "ACCEPTED" });
    expect((await testDb.guest.findUniqueOrThrow({ where: { id: guest.id } })).musicWish).toBe("Меладзе");

    await submitRsvp(token, { status: "ACCEPTED", musicWish: "" });
    expect((await testDb.guest.findUniqueOrThrow({ where: { id: guest.id } })).musicWish).toBeNull();
  });
});
