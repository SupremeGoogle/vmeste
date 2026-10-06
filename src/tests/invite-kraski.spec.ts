import { describe, expect, it } from "vitest";
import { readBlockContent, parseBlockContent } from "@/lib/invite-blocks";
import { KRASKI_TEMPLATE } from "@/lib/invite-templates/kraski";
import { findTemplate } from "@/lib/invite-templates";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import { rsvpInputSchema } from "@/server/services/rsvp";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks = (): InviteBlockView[] => KRASKI_TEMPLATE.blocks.map((block, order) => ({
  id: `kraski-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));

describe("Краски любви", () => {
  it("доступен для выбора и сохраняет все блоки при проверке", () => {
    expect(findTemplate("kraski")).toMatchObject({ id: KRASKI_TEMPLATE.id, name: KRASKI_TEMPLATE.name, theme: KRASKI_TEMPLATE.theme, blocks: expect.arrayContaining(KRASKI_TEMPLATE.blocks) });
    for (const block of KRASKI_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("показывает исходные иллюстрации и даёт менять текст, фото, ссылку и палитру", () => {
    const sample = blocks();
    const date = new Date("2027-11-20T09:00:00Z");
    const body = renderBlocks(sample, null, null, date, KRASKI_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({ title: "Краски любви", theme: KRASKI_TEMPLATE.theme, body, script: inviteScript(sample, KRASKI_TEMPLATE.theme, "Данил и Камила") });
    expect(page).toContain('class="sheet kraski"');
    for (const filename of ["hero.webp", "couple-sunset.webp", "resort.webp"]) {
      expect(page).toContain(`/media/invite-kraski/${filename}`);
    }
    expect(page).toContain('id="rsvp"');
    expect(page).toContain("kl-countdown");
    expect(body).not.toContain('<section class="personal-childhood"');
    const editable = renderBlocks(sample, null, null, date, KRASKI_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    for (const attr of ["data-inline-edit", "data-image-edit", "data-link-edit", "data-color-edit"]) {
      expect(editable).toContain(attr);
    }
  });

  it("позволяет гостю отложить ответ в анкете", () => {
    const input = rsvpInputSchema.safeParse({ status: "PENDING", drinkOptionIds: [] });
    expect(input.success).toBe(true);
    const body = renderBlocks(blocks(), "/i/wedding/token/rsvp", null, new Date("2027-11-20T09:00:00Z"), KRASKI_TEMPLATE.theme, "Europe/Moscow", {
      rsvp: {
        action: "/i/wedding/token/rsvp", guestName: "Гость", status: "PENDING", drinks: [{ id: "wine", title: "Вино" }],
        chosenDrinks: [], musicWish: "", saved: true, error: null,
        keep: { mealOptionId: "meal", comment: "Без орехов", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      },
    });
    expect(body).toContain('action="/i/wedding/token/rsvp"');
    expect(body).toContain('name="status" value="PENDING" checked');
    expect(body).toContain('name="mealOptionId" value="meal"');
    expect(body).toContain('name="comment" value="Без орехов"');
    expect(body).not.toContain('data-demo="true"');
  });
});
