import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { ROSERAIE_TEMPLATE } from "@/lib/invite-templates/roseraie";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks = (): InviteBlockView[] => ROSERAIE_TEMPLATE.blocks.map((block, order) => ({
  id: `roseraie-${order}`, type: block.type, order, visible: true,
  ...readBlockContent(block.type, block.content),
}));

describe("Розерай", () => {
  it("доступен в каталоге и проходит проверку содержимого", () => {
    expect(findTemplate("roseraie")).toMatchObject({ id: ROSERAIE_TEMPLATE.id, name: ROSERAIE_TEMPLATE.name, theme: ROSERAIE_TEMPLATE.theme, blocks: expect.arrayContaining(ROSERAIE_TEMPLATE.blocks) });
    expect(ROSERAIE_TEMPLATE.blocks.some((block) => block.type === "RSVP_FORM")).toBe(false);
    for (const block of ROSERAIE_TEMPLATE.blocks) expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
  });

  it("показывает конверт, фотографии, программу, площадку и завершение", () => {
    const sample = blocks();
    const body = renderBlocks(sample, null, null, new Date("2027-06-12T14:00:00Z"), ROSERAIE_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({ title: "Розерай", theme: ROSERAIE_TEMPLATE.theme, body, script: inviteScript(sample, ROSERAIE_TEMPLATE.theme, "Себастьян и София") });
    expect(page).toContain('class="sheet roseraie"');
    for (const name of ["hero.webp", "portrait.webp", "venue.webp", "botanical.webp", "envelope.webp"]) expect(page).toContain(`/media/invite-roseraie/${name}`);
    for (const cls of ["rr-envelope", "rr-photos", "rr-timeline", "rr-venue-card", "rr-last-photo"]) expect(page).toContain(cls);
    expect(body).not.toContain("<form");
  });

  it("разрешает править текст, фотографии, ссылку и порядок разделов", () => {
    const body = renderBlocks(blocks(), null, null, undefined, ROSERAIE_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    for (const attr of ["data-inline-edit", "data-image-edit", "data-link-edit", 'data-block-action="up"']) expect(body).toContain(attr);
  });

  it("показывает управление музыкой, если организатор выбрал трек", () => {
    const theme = { ...ROSERAIE_TEMPLATE.theme, musicUrl: "/media/music/song.mp3" };
    const body = renderBlocks(blocks(), null, null, undefined, theme, "Europe/Moscow");
    expect(body).toContain('id="rrMusic"');
    expect(body).toContain('id="rrMusicToggle"');
  });
});
