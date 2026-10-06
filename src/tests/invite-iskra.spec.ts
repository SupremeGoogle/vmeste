import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { findTemplate } from "@/lib/invite-templates";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { invitePage, inviteScript, renderBlocks, hasTemplateIntro } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";
import { SAMPLE_WISHLIST } from "@/server/guest-html/wishlist";

const template = findTemplate("iskra")!;
const blocks: InviteBlockView[] = template.blocks.map((block, order) => ({
  id: `iskra-${order}`, type: block.type, order, visible: block.visible !== false,
  ...readBlockContent(block.type, block.content),
}));
const date = new Date("2027-07-11T14:00:00Z");

describe("Искра: общий стандарт приглашений", () => {
  it("содержит весь каркас и скрытый виш-лист; локальные изображения допустимы", () => {
    expect(template.blocks.map((b) => b.type)).toEqual(["COVER", "CALENDAR", "COUNTDOWN", "TIMELINE", "VENUE", "DRESSCODE", "PHOTOS", "WISHLIST", "RSVP_FORM", "TEXT"]);
    expect(template.blocks.find((b) => b.type === "WISHLIST")?.visible).toBe(false);
    expect(hasTemplateIntro("iskra")).toBe(true);
    for (const block of template.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
      for (const path of JSON.stringify(block.content).match(/\/media\/invite-iskra\/[^"\s]+/g) ?? []) expect(existsSync(`public${path}`), path).toBe(true);
    }
  });

  it("не дублирует карту и обложку; редактор помечает разделы, текст, фото и палитру", () => {
    const body = renderBlocks(blocks, null, null, date, template.theme, "Europe/Moscow", { editable: true });
    expect(body.match(/data-content-block=/g)).toHaveLength(blocks.length);
    expect(body.match(/<iframe /g)).toHaveLength(1);
    expect(body).not.toContain('class="ik-intro"');
    expect(body).toContain('data-path="label:iskra.open"');
    expect(body).toContain('data-path="photos.0.imageUrl"');
    expect(body).toContain('data-color-edit');
    expect(body).toContain('data-block-action="add-detail"');
    expect(body).toContain('data-block-action="add-photo"');
    expect(body).toContain('data-path="doneText"');
    const page = invitePage({ title: "Искра", body, theme: template.theme });
    expect(page).toContain('class="sheet iskra"');
    expect(page).toContain('/fonts/GreatVibes-Regular.ttf');
  });

  it("общая анкета отправляет ответ и сохраняет поля; имя можно исправить", () => {
    const body = renderBlocks(blocks, "/i/wedding/guest/rsvp", null, date, template.theme, "Europe/Moscow", { rsvp: {
      action: "/i/wedding/guest/rsvp", guestName: "Ирина", status: "ACCEPTED", drinks: [{ id: "wine", title: "Вино" }], chosenDrinks: ["wine"], musicWish: "",
      keep: { mealOptionId: "meal", comment: "Без лука", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] }, saved: true, error: null,
      questionFields: '<label>Трансфер<input name="questionAnswers[transfer]"></label>',
    } });
    expect(body).toContain('action="/i/wedding/guest/rsvp"');
    expect(body).toContain('name="guestName" value="Ирина"');
    expect(body).not.toContain('readonly');
    expect(body).toContain('name="mealOptionId" value="meal"');
    expect(body).toContain('name="comment" value="Без лука"');
    expect(body).toContain('value="wine" checked');
    expect(body).toContain('name="questionAnswers[transfer]"');
    expect(body).toContain('Спасибо за ответ!');
  });

  it("виш-лист — отдельная страница, без бумажной записки и галереи подарков в приглашении", () => {
    const wishlist = blocks.find((b) => b.type === "WISHLIST")!;
    const body = renderBlocks([wishlist], null, null, date, template.theme, "UTC", { wishlist: { ...SAMPLE_WISHLIST, pageHref: "/i/wedding/guest/wishlist" } });
    expect(body).toContain('href="/i/wedding/guest/wishlist"');
    expect(body).not.toContain('<ul class="vm-wl-grid"');
    expect(body).not.toContain('ik-paper-pin');
    const page = renderBlocks([wishlist], null, null, date, template.theme, "UTC", { wishlist: SAMPLE_WISHLIST, wishlistPage: true });
    expect(page).toContain('<ul class="vm-wl-grid"');
  });

  it("инициалы следуют именам, свои надписи можно убрать, заставка отключается", () => {
    const renamed = blocks.map((b) => b.type === "COVER" ? { ...b, content: { ...b.content, names: "Мария и Александр" } } : b) as InviteBlockView[];
    const theme = { ...template.theme, introOff: true, labels: { "iskra.mini-letter": "", "iskra.monogram": "Наш знак" } };
    const body = renderBlocks(renamed, null, null, date, theme);
    expect(body).not.toContain('Однажды');
    expect(body).toContain('Наш знак');
    expect(inviteScript(renamed, theme, "Мария и Александр")).toContain('.ik-open');
    expect(renderBlocks(renamed, null, null, date, template.theme)).toContain('М · А');
  });

  it("пустые фотографии не показывают сломанные картинки; календарь учитывает часовой пояс", () => {
    const blank = blocks.map((b) => b.type === "PHOTOS" ? { ...b, content: { ...b.content, items: [{ imageUrl: "", caption: "Скрыто" }] } } : b) as InviteBlockView[];
    expect(renderBlocks(blank, null, null, date, template.theme)).not.toContain('Скрыто');
    const midnight = renderBlocks(blocks, null, null, new Date("2027-07-31T22:30:00Z"), template.theme, "Europe/Kaliningrad");
    expect(midnight).toContain('август 2027');
    expect(midnight).toContain('aria-current="date"');
  });
});
