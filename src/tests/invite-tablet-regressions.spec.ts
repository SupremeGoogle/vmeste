import { describe, expect, it } from "vitest";
import { findTemplate } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { renderBlocks } from "@/server/guest-html/invite-html";
import { personalizeMarkup } from "@/server/guest-html/personalization";
import type { InviteBlockView } from "@/server/repositories/invites";

function sample(id: string) {
  const template = findTemplate(id)!;
  const blocks: InviteBlockView[] = template.blocks.map((block, order) => ({
    id: `${id}-${order}`, type: block.type, order, visible: block.visible !== false,
    ...readBlockContent(block.type, block.content),
  }));
  return { template, blocks };
}

describe("Исправления после просмотра приглашений на планшете", () => {
  it.each(["odnazhdy", "little-happiness", "priznanie"])("%s: одна общая анкета с настоящим адресом отправки и сохранённым ответом", (id) => {
    const { template, blocks } = sample(id);
    const html = renderBlocks(blocks, "/i/test/guest/rsvp", null, new Date("2027-07-11T14:00:00Z"), template.theme, "UTC", { rsvp: {
      action: "/i/test/guest/rsvp", guestName: "Ирина", status: "ACCEPTED",
      drinks: [{ id: "wine", title: "Вино" }], chosenDrinks: ["wine"], musicWish: "",
      keep: { mealOptionId: "meal", comment: "Без лука", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      saved: true, error: null, questionFields: '<label>Трансфер<input name="questionAnswers[transfer]"></label>',
    } });
    expect(html.match(/<form\b/g)).toHaveLength(1);
    expect(html).toContain('class="vm-rsvp"');
    expect(html).toContain('action="/i/test/guest/rsvp"');
    expect(html).toContain('name="guestName" value="Ирина"');
    expect(html).toContain('name="mealOptionId" value="meal"');
    expect(html).toContain('value="wine" checked');
    expect(html).toContain('name="questionAnswers[transfer]"');
    expect(html).not.toContain('data-demo="true"');
  });

  it("Антик: фотографии обложки не повторяются под каждым из её двух разделов", () => {
    const { template, blocks } = sample("antic");
    const cover = blocks.find(b => b.type === "COVER")!;
    const photos = "photos" in cover.content ? cover.content.photos : [];
    const html = personalizeMarkup(renderBlocks(blocks, null, null, undefined, template.theme), blocks, template.theme);
    for (const photo of photos) expect(html.split(`src="${photo.imageUrl}"`).length - 1).toBe(1);
    expect(html).not.toContain('<section class="personal-childhood"></section>');
  });

  it("дополнительные фотографии добавляются один раз, даже если обложка имеет несколько разделов", () => {
    const { template, blocks } = sample("antic");
    const cover = blocks.find(b => b.type === "COVER")!;
    const html = personalizeMarkup(`<section data-content-block="${cover.id}">Первая часть</section><section data-content-block="${cover.id}">Вторая часть</section>`, [cover], template.theme);
    expect(html.match(/class="personal-childhood"/g)).toHaveLength(1);
  });
});
