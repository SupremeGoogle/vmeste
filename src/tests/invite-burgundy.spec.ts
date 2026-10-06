import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { BURGUNDY_TEMPLATE } from "@/lib/invite-templates/burgundy";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks = (): InviteBlockView[] => BURGUNDY_TEMPLATE.blocks.map((block, order) => ({
  id: `burgundy-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));

describe("Винный конверт", () => {
  it("доступен в каталоге и все его поля проходят проверку", () => {
    expect(findTemplate("burgundy")).toMatchObject({ id: BURGUNDY_TEMPLATE.id, name: BURGUNDY_TEMPLATE.name, theme: BURGUNDY_TEMPLATE.theme, blocks: expect.arrayContaining(BURGUNDY_TEMPLATE.blocks) });
    expect(BURGUNDY_TEMPLATE.blocks.some((block) => block.type === "RSVP_FORM")).toBe(false);
    for (const block of BURGUNDY_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("показывает конверт, арку, отсчёт, программу, карту и палитру без анкеты", () => {
    const sample = blocks();
    const body = renderBlocks(sample, null, null, new Date("2027-07-11T14:00:00Z"), BURGUNDY_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({ title: "Винный конверт", theme: BURGUNDY_TEMPLATE.theme, body, script: inviteScript(sample, BURGUNDY_TEMPLATE.theme, "Анна и Михаил") });
    expect(page).toContain('class="sheet burgundy"');
    for (const name of ["hero.webp", "venue.webp", "dress.webp"]) expect(body).toContain(`/media/invite-burgundy/${name}`);
    for (const cls of ["bw-envelope", "bw-clock", "bw-timeline", "bw-map-frame", "bw-palette"]) expect(body).toContain(cls);
    expect(body).not.toContain("<form");
    expect(body).not.toContain('id="rsvp"');
  });

  it("помечает тексты, изображения, ссылку, цвета и разделы для редактора", () => {
    const body = renderBlocks(blocks(), null, null, undefined, BURGUNDY_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    for (const attr of ["data-inline-edit", "data-image-edit", "data-link-edit", "data-color-edit", 'data-block-action="up"']) expect(body).toContain(attr);
  });
});
