import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { SKVOZ_VREMYA_TEMPLATE } from "@/lib/invite-templates/skvoz-vremya";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks = (): InviteBlockView[] => SKVOZ_VREMYA_TEMPLATE.blocks.map((block, order) => ({
  id: `skvoz-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));

describe("Сквозь время · цвет", () => {
  it("доступен в каталоге, а фотографии и блоки проходят проверку", () => {
    expect(findTemplate("skvoz-vremya")).toMatchObject({ id: SKVOZ_VREMYA_TEMPLATE.id, name: SKVOZ_VREMYA_TEMPLATE.name, theme: SKVOZ_VREMYA_TEMPLATE.theme, blocks: expect.arrayContaining(SKVOZ_VREMYA_TEMPLATE.blocks) });
    for (const block of SKVOZ_VREMYA_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("показывает обложку, историю, фотографии, программу и анкету", () => {
    const sample = blocks();
    const date = new Date("2027-06-20T13:00:00Z");
    const body = renderBlocks(sample, null, null, date, SKVOZ_VREMYA_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({ title: "Сквозь время", theme: SKVOZ_VREMYA_TEMPLATE.theme, body, script: inviteScript(sample, SKVOZ_VREMYA_TEMPLATE.theme, "Вера и Кирилл") });
    expect(page).toContain('class="sheet skvoz-vremya"');
    for (const name of ["hero.webp", "childhood.webp", "couple.webp", "venue.webp"]) {
      expect(page).toContain(`/media/invite-skvoz-vremya/${name}`);
    }
    expect(body).toContain('href="#sv-story"');
    expect(body).toContain('class="sv-clock"');
    expect(body).toContain('class="sv-map"');
    expect(body).toContain('id="rsvp"');
    expect(body).toContain('20 · 06 · 2027');
  });

  it("помечает текст, фотографии, ссылку и цвета для редактора", () => {
    const body = renderBlocks(blocks(), null, null, undefined, SKVOZ_VREMYA_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    for (const attr of ["data-inline-edit", "data-image-edit", "data-link-edit", "data-color-edit", "data-block-action=\"up\""]) {
      expect(body).toContain(attr);
    }
  });

  it("анкета сохраняет гостя, спутника и выбор напитков", () => {
    const body = renderBlocks(blocks(), null, null, new Date("2027-06-20T13:00:00Z"), SKVOZ_VREMYA_TEMPLATE.theme, "Europe/Moscow", {
      rsvp: {
        action: "/i/wedding/token/rsvp", guestName: "Гость", status: "ACCEPTED", drinks: [{ id: "wine", title: "Вино" }],
        chosenDrinks: ["wine"], musicWish: "", saved: true, error: null,
        keep: { mealOptionId: "meal", comment: "Без орехов", plusOneName: "Спутник", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      },
    });
    expect(body).toContain('action="/i/wedding/token/rsvp"');
    expect(body).toContain('name="mealOptionId" value="meal"');
    expect(body).toContain('name="plusOneName" value="Спутник"');
    expect(body).toContain('name="drinkOptionIds" value="wine" checked');
  });
});
