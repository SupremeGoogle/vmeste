import { describe, expect, it } from "vitest";
import { readBlockContent, parseBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { SILK_SAMPLE_IMAGES } from "@/lib/invite-templates/silk-assets";
import { SILK_TEMPLATE } from "@/lib/invite-templates/silk";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

function templateBlocks(): InviteBlockView[] {
  return SILK_TEMPLATE.blocks.map((block, index) => ({
    id: `silk-${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Шёлк", () => {
  it("зарегистрирован с одной локацией и тремя заменяемыми фотографиями", () => {
    expect(findTemplate("silk")).toMatchObject({ id: SILK_TEMPLATE.id, name: SILK_TEMPLATE.name, theme: SILK_TEMPLATE.theme, blocks: expect.arrayContaining(SILK_TEMPLATE.blocks) });
    expect(SILK_SAMPLE_IMAGES).toEqual([
      "/media/invite-silk/couple.webp",
      "/media/invite-silk/venue.webp",
      "/media/invite-silk/dinner.webp",
    ]);
    expect(SILK_TEMPLATE.blocks.filter((block) => block.type === "VENUE")).toHaveLength(1);
    expect(SILK_TEMPLATE.blocks.filter((block) => block.type === "PHOTOS")).toHaveLength(1);
    for (const block of SILK_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("рисует самостоятельный макет и подключает анимацию", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, "/rsvp", null, new Date("2027-10-14T14:00:00Z"), SILK_TEMPLATE.theme, "Europe/Moscow");
    const page = invitePage({
      title: "Шёлк",
      theme: SILK_TEMPLATE.theme,
      body,
      script: inviteScript(blocks, SILK_TEMPLATE.theme, "Этан и Серафина"),
    });
    expect(page).toContain('class="sheet silk"');
    expect(page).toContain("silk-cover-wave");
    expect(page).toContain("silk-weekend-grid");
    expect(page).toContain("silk-venue-card");
    expect(page).toContain("Единственная локация");
    expect(page).toContain("silk-progress");
    expect(page).toContain("data-silk-parallax");
    expect(page).toContain(SILK_SAMPLE_IMAGES[0]);
    expect(page).toContain(SILK_SAMPLE_IMAGES[1]);
    expect(page).toContain(SILK_SAMPLE_IMAGES[2]);
    expect(page).not.toContain("data-inline-edit");
    expect(inviteScript(blocks, SILK_TEMPLATE.theme, "Этан и Серафина")).toContain("silk-motion");
  });

  it("помечает текст и фотографии для визуального редактора", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, null, null, new Date("2027-10-14T14:00:00Z"), SILK_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    expect(body).toContain("data-inline-edit");
    expect(body).toContain("data-image-edit");
    expect(body).toContain("data-block-action=\"add-detail\"");
    expect(body).toContain("data-block-action=\"remove-detail\"");
    expect(body).toContain("data-color-edit");
    expect(body).toContain('data-path="buttonLabel"');
    const venue = blocks.find((block) => block.type === "VENUE")!;
    expect(body).toContain(`data-block-id="${venue.id}" data-path="imageUrl"`);
  });

  it("после удаления фото оставляет место, по которому снимок можно вернуть", () => {
    const blocks = templateBlocks();
    const cover = blocks.find((block) => block.type === "COVER")!;
    cover.content = { ...cover.content, imageUrl: "" };
    const venue = blocks.find((block) => block.type === "VENUE")!;
    venue.content = { ...venue.content, imageUrl: "" };
    const body = renderBlocks(blocks, null, null, new Date("2027-10-14T14:00:00Z"), SILK_TEMPLATE.theme, "Europe/Moscow", { editable: true });
    expect(body).toContain("Добавить фотографию пары");
    expect(body).toContain("Добавить фотографию локации");
  });
});
