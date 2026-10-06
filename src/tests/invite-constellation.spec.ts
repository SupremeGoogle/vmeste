import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { CONSTELLATION_SAMPLE_IMAGES } from "@/lib/invite-templates/constellation-assets";
import { CONSTELLATION_TEMPLATE } from "@/lib/invite-templates/constellation";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

function templateBlocks(): InviteBlockView[] {
  return CONSTELLATION_TEMPLATE.blocks.map((block, index) => ({
    id: `constellation-${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Созвездие", () => {
  it("зарегистрирован с одной локацией и тремя заменяемыми фотографиями", () => {
    expect(findTemplate("constellation")).toMatchObject({ id: CONSTELLATION_TEMPLATE.id, name: CONSTELLATION_TEMPLATE.name, theme: CONSTELLATION_TEMPLATE.theme, blocks: expect.arrayContaining(CONSTELLATION_TEMPLATE.blocks) });
    expect(CONSTELLATION_SAMPLE_IMAGES).toEqual([
      "/media/invite-constellation/couple.webp",
      "/media/invite-constellation/venue.webp",
      "/media/invite-constellation/dinner.webp",
    ]);
    expect(CONSTELLATION_TEMPLATE.blocks.filter((block) => block.type === "VENUE")).toHaveLength(1);
    expect(CONSTELLATION_TEMPLATE.blocks.filter((block) => block.type === "PHOTOS")).toHaveLength(1);
    for (const block of CONSTELLATION_TEMPLATE.blocks) expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
  });

  it("рисует самостоятельный ночной макет с многоуровневой анимацией", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, "/rsvp", null, new Date("2027-06-21T16:30:00Z"), CONSTELLATION_TEMPLATE.theme, "Europe/Rome");
    const script = inviteScript(blocks, CONSTELLATION_TEMPLATE.theme, "Александр и Ева");
    const page = invitePage({ title: "Созвездие", theme: CONSTELLATION_TEMPLATE.theme, body, script });
    expect(page).toContain('class="sheet constellation"');
    expect(page).toContain("constellation-eclipse");
    expect(page).toContain("constellation-comet");
    expect(page).toContain("constellation-gallery-track");
    expect(page).toContain("constellation-aurora");
    expect(page).toContain("data-constellation-parallax");
    for (const image of CONSTELLATION_SAMPLE_IMAGES) expect(page).toContain(image);
    expect(script).toContain("constellation-motion");
    expect(script).toContain("--timeline-progress");
    expect(script).not.toContain("<script>");
  });

  it("помечает весь изменяемый контент для визуального редактора", () => {
    const body = renderBlocks(templateBlocks(), null, null, new Date("2027-06-21T16:30:00Z"), CONSTELLATION_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(body).toContain("data-inline-edit");
    expect(body).toContain("data-image-edit");
    expect(body).toContain("data-link-edit");
    expect(body).toContain("data-color-edit");
    expect(body).toContain('data-block-action="add-detail"');
    expect(body).toContain('data-block-action="remove-detail"');
  });

  it("после удаления фотографий оставляет точки загрузки в редакторе", () => {
    const blocks = templateBlocks();
    const cover = blocks.find((block) => block.type === "COVER")!;
    cover.content = { ...cover.content, imageUrl: "" };
    const venue = blocks.find((block) => block.type === "VENUE")!;
    venue.content = { ...venue.content, imageUrl: "" };
    const photos = blocks.find((block) => block.type === "PHOTOS")!;
    photos.content = { ...photos.content, items: [] };
    const edited = renderBlocks(blocks, null, null, new Date("2027-06-21T16:30:00Z"), CONSTELLATION_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(edited).toContain("Добавить фотографию пары");
    expect(edited).toContain("Добавить фотографию локации");
    expect(edited).toContain("Добавить фотографию");
    const guest = renderBlocks(blocks, null, null, new Date("2027-06-21T16:30:00Z"), CONSTELLATION_TEMPLATE.theme, "Europe/Rome");
    expect(guest).not.toContain("Добавить фотографию");
  });
});
