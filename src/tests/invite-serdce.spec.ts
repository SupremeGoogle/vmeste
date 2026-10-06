import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent, type BlockContentMap } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { SERDCE_TEMPLATE } from "@/lib/invite-templates/serdce";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks = (): InviteBlockView[] => SERDCE_TEMPLATE.blocks.map((block, order) => ({
  id: `serdce-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));

describe("Сердце к сердцу", () => {
  it("доступен в каталоге и все его блоки сохраняются по схеме", () => {
    expect(findTemplate("serdce")).toMatchObject({ id: SERDCE_TEMPLATE.id, name: SERDCE_TEMPLATE.name, theme: SERDCE_TEMPLATE.theme, blocks: expect.arrayContaining(SERDCE_TEMPLATE.blocks) });
    for (const block of SERDCE_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("рисует полароиды, фактуру, место, образы, анкету и часы", () => {
    const sample = blocks();
    const date = new Date("2027-11-20T13:00:00Z");
    const body = renderBlocks(sample, null, null, date, SERDCE_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({ title: "Сердце к сердцу", theme: SERDCE_TEMPLATE.theme, body, script: inviteScript(sample, SERDCE_TEMPLATE.theme, "Денис и Лера") });
    expect(page).toContain('class="sheet serdce"');
    for (const name of ["hero.webp", "venue.webp", "dresscode.webp", "dresscode-men.webp", "story-1.webp", "story-6.webp"]) {
      expect(page).toContain(`/media/invite-serdce/${name}`);
    }
    expect(page).toContain("paper.svg");
    expect((body.match(/class="sc-story-episode /g) ?? [])).toHaveLength(5);
    expect(body).toContain('class="sc-story-photos paired"');
    expect(body).toContain('class="sc-story-arch"');
    expect(page).toContain('id="rsvp"');
    expect(page).toContain('class="sc-clock"');
    expect(page).toContain('class="sc-music-toggle"');
    expect(body).not.toContain('<section class="personal-childhood"');
    const editable = renderBlocks(sample, null, null, date, SERDCE_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    for (const attr of ["data-inline-edit", "data-image-edit", "data-link-edit", "data-color-edit"]) {
      expect(editable).toContain(attr);
    }
  });

  it("отправляет анкету по именной ссылке и сохраняет прежние поля ответа", () => {
    const body = renderBlocks(blocks(), "/i/wedding/token/rsvp", null, new Date("2027-11-20T13:00:00Z"), SERDCE_TEMPLATE.theme, "Europe/Moscow", {
      rsvp: {
        action: "/i/wedding/token/rsvp", guestName: "Гость", status: "ACCEPTED", drinks: [{ id: "wine", title: "Вино" }],
        chosenDrinks: ["wine"], musicWish: "", saved: true, error: null,
        keep: { mealOptionId: "meal", comment: "Без орехов", plusOneName: "Спутник", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      },
    });
    expect(body).toContain('action="/i/wedding/token/rsvp"');
    expect(body).toContain('name="mealOptionId" value="meal"');
    expect(body).toContain('name="comment" value="Без орехов"');
    expect(body).toContain('name="plusOneName" value="Спутник"');
    expect(body).toContain('name="drinkOptionIds" value="wine" checked');
    expect(body).not.toContain('data-demo="true"');
  });

  it("показывает новые фотографии истории после добавления в редакторе", () => {
    const sample = blocks();
    const continuation = sample.find((block) => block.type === "PHOTOS" && block.order === 2)!;
    const current = continuation.content as BlockContentMap["PHOTOS"];
    continuation.content = { ...current, items: [...current.items, { imageUrl: "/media/invite-serdce/extra.webp", caption: "" }] };
    const body = renderBlocks(sample, null, null, undefined, SERDCE_TEMPLATE.theme, "Europe/Moscow");
    expect((body.match(/class="sc-story-episode /g) ?? [])).toHaveLength(6);
    expect(body).toContain("/media/invite-serdce/extra.webp");
  });
});
