import { describe, expect, it } from "vitest";
import { INVITE_TEMPLATES, findTemplate } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { renderBlocks, invitePage } from "@/server/guest-html/invite-html";
import { rsvpFieldsHtml } from "@/server/guest-html/rsvp-fields";
import { SAMPLE_WISHLIST } from "@/server/guest-html/wishlist";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";

const fields = rsvpFieldsHtml([
  { id: "meal", type: "MEAL", title: "Что подать на ужин", description: "", required: false, options: [] },
], {
  meals: [{ id: "fish", title: "Рыба" }], drinks: [], selectedMeal: "fish", selectedDrinks: [], answers: [],
});
const rsvp: TiliRsvp = {
  action: "/i/test/guest/rsvp", guestName: "Иван Петров", status: "ACCEPTED",
  drinks: [], chosenDrinks: [], musicWish: "", saved: false, error: null,
  keep: { mealOptionId: null, comment: "", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
  questionFields: fields, extraFields: fields,
};
function blocks(id: string) {
  return findTemplate(id)!.blocks.filter(b => b.type === "RSVP_FORM" || b.type === "WISHLIST").map((b, order) => ({
    id: `${id}-${order}`, type: b.type, order, visible: true, ...readBlockContent(b.type, b.content),
  }));
}

describe("Поля конструктора и подарки в каждом шаблоне", () => {
  it.each(INVITE_TEMPLATES.map(t => t.id))("%s: блюдо внутри рабочей анкеты, оформление в документе, виш-лист открывается", id => {
    const template = findTemplate(id)!;
    const body = renderBlocks(blocks(id), null, null, new Date("2027-07-11"), template.theme, "UTC", {
      rsvp, wishlist: { ...SAMPLE_WISHLIST, pageHref: "/i/test/wishlist" },
    });
    const form = body.match(/<form\b[^>]*action="\/i\/test\/guest\/rsvp"[\s\S]*?<\/form>/)?.[0];
    expect(form).toContain('data-rsvp-field="meal"');
    expect(form).toContain('name="mealOptionId" value="fish" checked');
    expect(body).toContain('href="/i/test/wishlist"');
    const page = invitePage({ title: template.name, body, theme: template.theme, styleMeta: true });
    const head = page.split("</head>")[0];
    expect(head).toContain(".rsvp-fields.rsvp-fields fieldset");
    expect(head).toContain(".vm-wl .vm-wl-btn");
  });

  it("Тили-тесто: срок ответа показывается один раз, вопросы остаются", () => {
    const template = findTemplate("tili")!;
    const errorText = "Срок ответа истёк. Напишите организатору — он отметит вас вручную.";
    const html = renderBlocks(blocks("tili"), null, null, undefined, template.theme, "UTC", {
      rsvp: { ...rsvp, error: "deadline", errorText, extraFields: `<p class="rsvp-error">${errorText}</p>${fields}` },
    });
    expect(html.split(errorText)).toHaveLength(2);
    expect(html).toContain('data-rsvp-field="meal"');
  });
});
