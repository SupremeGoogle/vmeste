import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { readBlockContent, parseBlockContent } from "@/lib/invite-blocks";
import { findTemplate, PICKABLE_TEMPLATES } from "@/lib/invite-templates";
import { EDITORIAL_IDS } from "@/lib/invite-templates/editorial";
import { EDITORIAL_SAMPLE_IMAGES } from "@/lib/invite-templates/editorial-assets";
import { weddingSchema } from "@/lib/invite-personalization";
import { invitePage, inviteScript, renderBlocks, hasTemplateIntro } from "@/server/guest-html/invite-html";
import { SAMPLE_WISHLIST } from "@/server/guest-html/wishlist";
import type { InviteBlockView } from "@/server/repositories/invites";

for (const id of EDITORIAL_IDS) {
  describe(`Editorial invitation: ${id}`, () => {
    const template = findTemplate(id)!;
    const blocks = (): InviteBlockView[] => template.blocks.map((b, order) => ({ id: `${id}-${order}`, type: b.type, visible: b.visible !== false, order, ...readBlockContent(b.type, b.content) }));
    const date = new Date("2027-09-12T13:00:00Z");

    it("can be selected with valid content, local artwork and all required sections", () => {
      expect(PICKABLE_TEMPLATES).toContain(template);
      expect(hasTemplateIntro(id)).toBe(true);
      for (const type of ["COVER", "CALENDAR", "COUNTDOWN", "TIMELINE", "VENUE", "DRESSCODE", "PHOTOS", "WISHLIST", "RSVP_FORM", "TEXT"]) expect(template.blocks.some(b => b.type === type)).toBe(true);
      expect(template.blocks.find(b => b.type === "WISHLIST")?.visible).toBe(false);
      for (const b of template.blocks) expect(parseBlockContent(b.type, b.content).ok, b.type).toBe(true);
      for (const path of EDITORIAL_SAMPLE_IMAGES) expect(fs.existsSync(`public${path}`)).toBe(true);
    });

    it("supports editable copy, media, labels, colours and existing timeline actions", () => {
      const body = renderBlocks(blocks(), null, null, date, template.theme, "Europe/Moscow", { editable: true });
      for (const attr of ["data-content-block", "data-inline-edit", "data-image-edit", "data-color-edit", "data-link-edit", 'data-block-action="up"', 'data-block-action="add-detail"', 'data-block-action="remove-detail"']) expect(body).toContain(attr);
      expect(body).toContain(`data-path="label:${id}.intro-open"`);
      expect(body).toContain('class="ed-selected" aria-current="date">12');
      expect(body).toContain('name="guestName"');
      expect(body).not.toContain("readonly");
      expect(body).not.toContain('class="personal-childhood"');
      if (id === "protokol") for (const index of [0, 1]) expect(body).toContain(`data-path="photos.${index}.imageUrl"`);
    });

    it("uses the couple's names, location, cleared labels and local wedding date", () => {
      const theme = { ...template.theme, labels: { [`${id}.intro-title`]: "Наше приглашение", [`${id}.seal`]: "", "gazette.photo-caption": "" }, wedding: weddingSchema.parse({ names: "Александра и Константин", city: "Тула", venueName: "Наш сад", venueAddress: "Новый адрес", mapUrl: "https://yandex.ru/maps/?text=Наш%20сад", childhood: false }) };
      const body = renderBlocks(blocks(), null, null, new Date("2027-09-12T22:30:00Z"), theme, "Europe/Kaliningrad");
      for (const text of ["Александра", "Константин", "13.09.2027", 'aria-current="date">13', "Наш сад", "Новый адрес", "Наше приглашение"]) expect(body).toContain(text);
      expect(body).not.toContain("Валерия");
      expect(body).not.toContain("Давид");
      expect(body).not.toContain("Двое. Одна история.");
      if (id === "protokol") for (const who of ["groom", "bride"]) expect(body).toContain(`protokol-${who}.webp`);
    });

    it("preserves visibility and order and keeps a hidden wishlist out of live invitations", () => {
      const list = blocks();
      list.find(b => b.type === "TIMELINE")!.visible = false;
      const venue = list.find(b => b.type === "VENUE")!;
      const body = renderBlocks([venue, ...list.filter(b => b !== venue)], null, null, date, template.theme);
      expect(body.indexOf('class="ed-section ed-venue"')).toBeLessThan(body.indexOf('class="ed-section ed-cover"'));
      expect(body).not.toContain('class="ed-section ed-timing"');
      expect(body).not.toContain('class="vm-wl-teaser"');
    });

    it("opens a separate wishlist with matching styling and supports introOff", () => {
      const list = blocks();
      list.find(b => b.type === "WISHLIST")!.visible = true;
      const wishlist = { ...SAMPLE_WISHLIST, pageHref: "/i/couple/wishlist" };
      const body = renderBlocks(list, null, null, date, template.theme, "UTC", { wishlist });
      expect(body).toContain('href="/i/couple/wishlist"');
      const ownPage = renderBlocks(list.filter(b => b.type === "WISHLIST"), null, null, date, template.theme, "UTC", { wishlist, wishlistPage: true });
      expect(ownPage).toContain('class="vm-wl"');
      expect(ownPage).not.toContain('class="vm-wl-teaser"');
      const theme = { ...template.theme, introOff: true };
      const page = invitePage({ title: template.name, theme, body, script: inviteScript(list, theme, "Ира и Никита") });
      expect(page).toContain(`class="sheet ${id}"`);
      expect(page).toContain("family=PT+Serif");
      expect(page).toContain(".ed-intro{display:none!important}");
      expect(page).toContain('document.querySelector(".ed-open")');
    });

    it("renders the wedding-day message instead of a negative countdown", () => {
      const body = renderBlocks(blocks(), null, null, new Date("2020-01-01"), template.theme);
      expect(body).toContain('class="vm-cd-done"');
      expect(body).toContain("Сегодня наша свадьба!");
    });
  });
}
