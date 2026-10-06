import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { WEDWED_TEMPLATES } from "@/lib/invite-templates/wedwed";
import { findTemplate } from "@/lib/invite-templates";
import { weddingSchema } from "@/lib/invite-personalization";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const sample = (index: number): InviteBlockView[] => WEDWED_TEMPLATES[index].blocks.map((b, order) => ({ id: `reference-${order}`, type: b.type, order, visible: true, ...readBlockContent(b.type, b.content) }));

describe("три приглашения из открытых вкладок", () => {
  for (const [index, template] of WEDWED_TEMPLATES.entries()) {
    it(`${template.name}: проходит сохранение и использует локальные изображения`, () => {
      expect(findTemplate(template.id)).toMatchObject({ id: template.id, name: template.name, theme: template.theme, blocks: expect.arrayContaining(template.blocks) });
      for (const block of template.blocks) {
        expect(parseBlockContent(block.type, block.content).ok, `${block.type}: ${JSON.stringify(block.content)}`).toBe(true);
      }
      const blocks = sample(index);
      const body = renderBlocks(blocks, null, null, new Date("2027-02-28T23:30:00Z"), template.theme, "Europe/Kaliningrad");
      const page = invitePage({ title: template.name, theme: template.theme, body, script: inviteScript(blocks, template.theme, "Михаил и Анна") });
      expect(page).not.toContain("{{");
      expect(page).not.toContain('/sitemaker/');
      expect(page).not.toContain('src=""');
      expect(page).not.toContain('class="personal-childhood"');
      expect(page).not.toContain('data-venue-map');
      expect(page).toContain('data-clock-unit="days"');
      expect(page).toContain('aria-current="date">1</');
      expect(page).toContain('Март');
      for (const path of page.matchAll(/(?:src|href)="(\/media\/[^"?]+)"/g)) {
        expect(existsSync(join(process.cwd(), "public", path[1])), path[1]).toBe(true);
      }
      const css = readFileSync(join(process.cwd(), "public/media", `invite-${template.id}`, "design.css"), "utf8");
      for (const url of css.matchAll(/url\("(\/media\/[^"?]+)"\)/g)) {
        expect(existsSync(join(process.cwd(), "public", url[1])), url[1]).toBe(true);
      }
    });
    it(`${template.name}: принимает данные свадьбы и сохраняет настройки анкеты`, () => {
      const theme = { ...template.theme, wedding: weddingSchema.parse({ names: 'Олег и Елена', city: '', venueName: 'Новая площадка', venueAddress: 'Новый адрес', mapUrl: 'https://yandex.ru/maps/?text=test', childhood: true, deadline: '2027-02-15T12:00:00Z' }) };
      const body = renderBlocks(sample(index), null, null, new Date("2027-03-01T12:00:00Z"), theme, "Europe/Kaliningrad", {
        editable: true,
        rsvp: { action: "/i/test/token/rsvp", guestName: "Гость", status: "ACCEPTED", drinks: [{ id: "wine", title: "Вино" }], chosenDrinks: ["wine"], musicWish: "", saved: true, error: null,
          keep: { mealOptionId: "meal", comment: "Без орехов", plusOneName: "Спутник", plusOneMealOptionId: "other-meal", plusOneDrinkOptionIds: ["water"] }, extraFields: '<input name="answer-custom" value="Мой ответ">' },
      });
      for (const value of ['Олег', 'Елена', 'Новая площадка', 'Новый адрес', 'action="/i/test/token/rsvp"', 'name="mealOptionId" value="meal"', 'name="comment" value="Без орехов"', 'name="plusOneDrinkOptionIds" value="water"', 'name="drinkOptionIds" value="wine" checked', 'name="answer-custom"', 'data-inline-edit', 'data-image-edit', 'data-link-edit', 'data-color-edit']) {
        expect(body.includes(value), value).toBe(true);
      }
      const hidden = sample(index).map(b => b.type === "TIMELINE" ? { ...b, visible: false } : b);
      expect(renderBlocks(hidden, null, null, undefined, theme)).not.toContain('We Meet');
    });
  }
});

