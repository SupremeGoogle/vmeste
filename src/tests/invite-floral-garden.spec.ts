import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { FLORAL_GARDEN_TEMPLATE } from "@/lib/invite-templates/floral-garden";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks: InviteBlockView[] = FLORAL_GARDEN_TEMPLATE.blocks.map((block, order) => ({
  id: `floral-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));
const date = new Date("2027-09-28T15:00:00Z");

describe("Цветочный сад", () => {
  it("зарегистрирован как редактируемый шаблон с допустимыми изображениями", () => {
    expect(findTemplate("floral-garden")).toMatchObject({ id: FLORAL_GARDEN_TEMPLATE.id, name: FLORAL_GARDEN_TEMPLATE.name, theme: FLORAL_GARDEN_TEMPLATE.theme, blocks: expect.arrayContaining(FLORAL_GARDEN_TEMPLATE.blocks) });
    for (const block of FLORAL_GARDEN_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("выводит главные разделы, мобильное фото, календарь и анкету", () => {
    const body = renderBlocks(blocks, null, null, date, FLORAL_GARDEN_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    const page = invitePage({ title: "Цветочный сад", theme: FLORAL_GARDEN_TEMPLATE.theme, body, script: inviteScript(blocks, FLORAL_GARDEN_TEMPLATE.theme, "Александр и Мария") });
    expect(page).toContain('class="sheet floral-garden"');
    expect(page).toContain("garden-mobile.webp");
    expect(body).toContain('id="greeting"');
    expect(body).toContain('id="rsvp"');
    expect(body).toContain("fg-day-heart");
    expect(body).toContain("Вилла Ротонда");
    expect(body).toContain("tel:+79990000000");
    expect(body).toContain("https://t.me/anna");
    expect(body).toContain("data-inline-edit");
    expect(body).toContain("data-image-edit");
    expect(body).toContain("data-color-edit");
    expect(body).toContain('data-demo="true"');
  });

  it("отправляет ответ по личной ссылке и сохраняет прежние поля гостя", () => {
    const body = renderBlocks(blocks, "/i/event/token/rsvp", null, date, FLORAL_GARDEN_TEMPLATE.theme, "Europe/Moscow", {
      rsvp: {
        action: "/i/event/token/rsvp", guestName: "Ирина", status: "ACCEPTED",
        drinks: [{ id: "sparkling", title: "Игристое" }], chosenDrinks: ["sparkling"], musicWish: "",
        keep: { mealOptionId: "meal-1", comment: "Без лука", plusOneName: "Алексей", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
        saved: false, error: null,
      },
    });
    expect(body).toContain('action="/i/event/token/rsvp"');
    expect(body).toContain('name="mealOptionId" value="meal-1"');
    expect(body).toContain('name="plusOneName" value="Алексей"');
    expect(body).toContain('value="Ирина"');
    expect(body).toContain('value="sparkling" checked');
  });
});
