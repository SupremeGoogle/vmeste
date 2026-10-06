import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { readBlockContent, parseBlockContent } from "@/lib/invite-blocks";
import { findTemplate, PICKABLE_TEMPLATES } from "@/lib/invite-templates";
import { weddingSchema } from "@/lib/invite-personalization";
import { invitePage, inviteScript, renderBlocks, hasTemplateIntro } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";

for (const id of ["zefir", "crayon"]) {
  describe(`Scrapbook invitation: ${id}`, () => {
    const template = findTemplate(id)!;
    const blocks = (): InviteBlockView[] => template.blocks.map((b, order) => ({ id: `${id}-${order}`, type: b.type, visible: b.visible !== false, order, ...readBlockContent(b.type, b.content) }));
    const date = new Date("2027-09-12T13:00:00Z");

    it("is selectable with all standard sections and a hidden wishlist", () => {
      expect(PICKABLE_TEMPLATES).toContain(template);
      expect(hasTemplateIntro(id)).toBe(true);
      for (const type of ["COVER", "CALENDAR", "COUNTDOWN", "TIMELINE", "VENUE", "DRESSCODE", "PHOTOS", "WISHLIST", "RSVP_FORM", "TEXT"]) expect(template.blocks.some(b => b.type === type)).toBe(true);
      expect(template.blocks.find(b => b.type === "WISHLIST")?.visible).toBe(false);
      for (const b of template.blocks) expect(parseBlockContent(b.type, b.content).ok, b.type).toBe(true);
      const cover = template.blocks[0].content as { photos: { imageUrl: string }[] };
      for (const p of cover.photos) expect(fs.existsSync(`public${p.imageUrl}`)).toBe(true);
    });

    it("renders editable sections, generated images, themed calendar, clock, and RSVP", () => {
      const body = renderBlocks(blocks(), null, null, date, template.theme, "Europe/Moscow", { editable: true });
      for (const attr of ["data-content-block", "data-inline-edit", "data-image-edit", "data-color-edit", "data-link-edit", 'data-block-action="up"', 'data-block-action="add-detail"']) expect(body).toContain(attr);
      expect(body).toContain('data-path="photos.0.caption"');
      expect(body).toContain('data-path="label:' + id + '.intro-open"');
      expect(body).toContain('class="sb-selected" aria-current="date">12');
      expect(body).toContain('class="vm-cd"');
      expect(body).toContain('name="guestName"');
      expect(body).not.toContain("readonly");
      expect(body).not.toContain('class="personal-childhood"');
    });

    it("uses the couple's own names, photos, location, labels, and event timezone", () => {
      const theme = { ...template.theme, labels: { [`${id}.intro-title`]: "Наше приглашение", [`${id}.photo-note`]: "", [`${id}.seal`]: "Своя монограмма" }, wedding: weddingSchema.parse({ names: "Александра и Константин", city: "", venueName: "Наш сад", venueAddress: "Новый адрес", mapUrl: "https://yandex.ru/maps/?text=Наш%20сад", deadline: "2027-08-01T12:00:00Z" }) };
      const body = renderBlocks(blocks(), null, null, new Date("2027-09-12T22:30:00Z"), theme, "Europe/Kaliningrad");
      expect(body).toContain("Александра");
      expect(body).toContain("Константин");
      expect(body).toContain("13.09.2027");
      expect(body).toContain('aria-current="date">13');
      expect(body).toContain("Наш сад");
      expect(body).toContain("Наше приглашение");
      expect(body).not.toContain("это мы ♡");
      expect(body).not.toContain("Валерия");
    });

    it("preserves block visibility and order, and does not duplicate childhood images", () => {
      const list = blocks();
      list.find(b => b.type === "TIMELINE")!.visible = false;
      const venue = list.find(b => b.type === "VENUE")!;
      const reordered = [venue, ...list.filter(b => b !== venue)];
      const body = renderBlocks(reordered, null, null, date, template.theme);
      expect(body.indexOf('class="sb-section sb-venue"')).toBeLessThan(body.indexOf('class="sb-section sb-cover"'));
      expect(body).not.toContain('class="sb-section sb-timeline"');
      expect(body).not.toContain('class="vm-wl-teaser"');
      expect(body).not.toContain('class="personal-childhood"');
      const noChildhood = renderBlocks(list, null, null, date, { ...template.theme, wedding: weddingSchema.parse({ names: "Ира и Никита", city: "", venueName: "", venueAddress: "", mapUrl: "", childhood: false }) });
      expect(noChildhood).not.toContain('class="sb-childhood"');
      expect(noChildhood).not.toContain("groom-child.webp");
    });

    it("supports named RSVP with the current answers and all custom questions", () => {
      const body = renderBlocks(blocks(), null, null, date, template.theme, "UTC", { rsvp: { action: "/i/wedding/token/rsvp", guestName: "Гость", status: "ACCEPTED", saved: true, error: null, drinks: [{ id: "wine", title: "Вино" }], chosenDrinks: ["wine"], musicWish: "", extraFields: '<input name="question:test" value="Ответ">', keep: { mealOptionId: "meal", comment: "Без орехов", plusOneName: "Спутник", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] }, plusOneAllowed: true } as TiliRsvp & { plusOneAllowed: boolean } });
      for (const value of ['action="/i/wedding/token/rsvp"', 'name="guestName" value="Гость"', 'name="drinkOptionIds" value="wine" checked', 'name="plusOneName" value="Спутник"', 'name="mealOptionId" value="meal"', 'name="question:test"']) expect(body).toContain(value);
    });

    it("renders the wishlist as its own section and applies the theme to the document", () => {
      const list = blocks();
      list.find(b => b.type === "WISHLIST")!.visible = true;
      const body = renderBlocks(list, null, null, date, template.theme, "UTC", { wishlist: { gifts: [{ id: "gift", title: "Подарок", description: "", url: "", imageUrl: "", taken: false, mine: false }], envelope: null, reserveAction: null, joinHref: null, pageHref: "/i/couple/wishlist", message: null } });
      expect(body).toContain('class="sb-section sb-wishlist"');
      expect(body).toContain('href="/i/couple/wishlist"');
      const page = invitePage({ title: template.name, theme: { ...template.theme, introOff: true }, body, script: inviteScript(list, { ...template.theme, introOff: true }, "Ира и Никита") });
      expect(page).toContain(`class="sheet ${id}"`);
      expect(page).toContain("family=Caveat");
      expect(page).toContain(".sb-intro{display:none!important}");
      expect(page).toContain('document.querySelector(".sb-open")');
    });

    it("shows the editable wedding-day message instead of a negative clock", () => {
      const body = renderBlocks(blocks(), null, null, new Date("2020-01-01"), template.theme);
      expect(body).toContain('class="vm-cd-done"');
      expect(body).toContain("Сегодня наш праздник!");
    });
  });
}
