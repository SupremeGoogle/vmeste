import { describe, expect, it } from "vitest";
import { readBlockContent, parseBlockContent } from "@/lib/invite-blocks";
import { BOHEMA_TEMPLATE } from "@/lib/invite-templates/bohema";
import { findTemplate } from "@/lib/invite-templates";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks = (): InviteBlockView[] => BOHEMA_TEMPLATE.blocks.map((block, order) => ({
  id: `bohema-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));

describe("Богема", () => {
  it("доступен для выбора, а все исходные блоки проходят проверку", () => {
    expect(findTemplate("bohema")).toMatchObject({ id: BOHEMA_TEMPLATE.id, name: BOHEMA_TEMPLATE.name, theme: BOHEMA_TEMPLATE.theme, blocks: expect.arrayContaining(BOHEMA_TEMPLATE.blocks) });
    for (const block of BOHEMA_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("рисует оригинальные изображения, заставку и редактируемые поля", () => {
    const sample = blocks();
    const date = new Date("2027-11-20T13:00:00Z");
    const body = renderBlocks(sample, null, null, date, BOHEMA_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({ title: "Богема", theme: BOHEMA_TEMPLATE.theme, body, script: inviteScript(sample, BOHEMA_TEMPLATE.theme, "Николай и Диана") });
    expect(page).toContain('class="sheet bohema"');
    expect(page).toContain('id="bo-intro-cover"');
    expect(page).toContain("/media/invite-bohema/landscape.webp");
    expect(page).toContain("/media/invite-bohema/veranda.webp");
    expect(page).toContain('id="rsvp"');
    expect(page).toContain("bo-countdown");
    const editable = renderBlocks(sample, null, null, date, BOHEMA_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    expect(editable).not.toContain('id="bo-intro-cover"');
    expect(editable).toContain("data-inline-edit");
    expect(editable).toContain("data-image-edit");
    expect(editable).toContain("data-link-edit");
    expect(editable).toContain("data-color-edit");
  });

  it("встроенная анкета отправляет ответ по именной ссылке и сохраняет прежний выбор", () => {
    const body = renderBlocks(blocks(), "/i/wedding/token/rsvp", null, new Date("2027-11-20T13:00:00Z"), BOHEMA_TEMPLATE.theme, "Europe/Moscow", {
      rsvp: {
        action: "/i/wedding/token/rsvp", guestName: "Гость", status: "PENDING", drinks: [{ id: "wine", title: "Вино" }],
        chosenDrinks: [], musicWish: "", saved: false, error: null,
        keep: { mealOptionId: "meal", comment: "Без орехов", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      },
    });
    expect(body).toContain('action="/i/wedding/token/rsvp"');
    expect(body).toContain('name="from" value="invite"');
    expect(body).toContain('name="mealOptionId" value="meal"');
    expect(body).toContain('name="comment" value="Без орехов"');
    expect(body).toContain('name="drinkOptionIds" value="wine"');
    expect(body).not.toContain('data-demo="true"');
  });
});
