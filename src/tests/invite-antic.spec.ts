import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { ANTIC_TEMPLATE } from "@/lib/invite-templates/antic";
import { findTemplate } from "@/lib/invite-templates";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const date = new Date("2027-11-20T13:00:00Z");
const blocks = (): InviteBlockView[] => ANTIC_TEMPLATE.blocks.map((block, order) => ({
  id: `antic-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));

describe("Антик", () => {
  it("доступен в каталоге и все его блоки проходят проверку", () => {
    expect(findTemplate("antic")).toMatchObject({ id: ANTIC_TEMPLATE.id, name: ANTIC_TEMPLATE.name, theme: ANTIC_TEMPLATE.theme, blocks: expect.arrayContaining(ANTIC_TEMPLATE.blocks) });
    for (const block of ANTIC_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("показывает все разделы, собственные фотографии и редакторские поля", () => {
    const sample = blocks();
    const body = renderBlocks(sample, null, null, date, ANTIC_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({ title: "Антик", theme: ANTIC_TEMPLATE.theme, body, script: inviteScript(sample, ANTIC_TEMPLATE.theme, "Олег и Валерия") });
    expect(page).toContain('class="sheet antic"');
    for (const filename of ["couple.webp", "mansion.webp", "palace.webp", "hero.webp"]) {
      expect(page).toContain(`/media/invite-antic/${filename}`);
    }
    for (const cls of ["ac-cover", "ac-invite", "ac-clock", "ac-program", "ac-venue", "ac-detail", "ac-dress", "ac-rsvp", "ac-finale"]) {
      expect(page).toContain(cls);
    }
    expect(page).toContain('id="rsvp"');
    expect(page).toContain('class="ac-cover-photo"');
    expect(page).not.toContain('class="ac-flutes"');
    expect(page).not.toContain('class="venue-map"');
    const editable = renderBlocks(sample, null, null, date, ANTIC_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    for (const attr of ["data-inline-edit", "data-image-edit", "data-link-edit", "data-color-edit"]) {
      expect(editable).toContain(attr);
    }
    expect(editable).toContain('data-path="photos.0.imageUrl"');
  });

  it("сохраняет настройки ответа гостя и имя спутника", () => {
    const body = renderBlocks(blocks(), null, null, date, ANTIC_TEMPLATE.theme, "Europe/Moscow", {
      rsvp: {
        action: "/i/wedding/token/rsvp", guestName: "Анна", status: "ACCEPTED",
        drinks: [{ id: "wine", title: "Вино" }], chosenDrinks: ["wine"],
        musicWish: "", saved: true, error: null,
        keep: { mealOptionId: "meal", comment: "Без орехов", plusOneName: "Михаил", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      },
    });
    expect(body).toContain('action="/i/wedding/token/rsvp"');
    expect(body).toContain('name="mealOptionId" value="meal"');
    expect(body).toContain('name="plusOneName" type="text" value="Михаил"');
    expect(body).toContain('name="acPlusOne" value="yes" checked');
    expect(body).toContain('name="drinkOptionIds" value="wine" checked');
  });
});
