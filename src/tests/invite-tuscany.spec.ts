import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { TUSCANY_SAMPLE_IMAGES } from "@/lib/invite-templates/tuscany-assets";
import { TUSCANY_TEMPLATE } from "@/lib/invite-templates/tuscany";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

function templateBlocks(): InviteBlockView[] {
  return TUSCANY_TEMPLATE.blocks.map((block, index) => ({
    id: `tuscany-${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Тоскана", () => {
  it("зарегистрирован с одной локацией и тремя заменяемыми фотографиями", () => {
    expect(findTemplate("tuscany")).toMatchObject({ id: TUSCANY_TEMPLATE.id, name: TUSCANY_TEMPLATE.name, theme: TUSCANY_TEMPLATE.theme, blocks: expect.arrayContaining(TUSCANY_TEMPLATE.blocks) });
    expect(TUSCANY_SAMPLE_IMAGES).toEqual([
      "/media/invite-tuscany/couple.webp",
      "/media/invite-tuscany/venue.webp",
      "/media/invite-tuscany/dinner.webp",
    ]);
    expect(TUSCANY_TEMPLATE.blocks.filter((block) => block.type === "VENUE")).toHaveLength(1);
    expect(TUSCANY_TEMPLATE.blocks.filter((block) => block.type === "PHOTOS")).toHaveLength(1);
    for (const block of TUSCANY_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("рисует самостоятельный бумажный макет с анимациями", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, "/rsvp", null, new Date("2027-11-15T14:00:00Z"), TUSCANY_TEMPLATE.theme, "Europe/Rome");
    const page = invitePage({
      title: "Тоскана",
      theme: TUSCANY_TEMPLATE.theme,
      body,
      script: inviteScript(blocks, TUSCANY_TEMPLATE.theme, "Оливия и Даниэль"),
    });
    expect(page).toContain('class="sheet tuscany"');
    expect(page).toContain("tuscany-cover-paper");
    expect(page).toContain("tuscany-seal");
    expect(page).toContain("tuscany-gallery-grid");
    expect(page).toContain("tuscany-progress");
    expect(page).toContain("data-tuscany-parallax");
    for (const image of TUSCANY_SAMPLE_IMAGES) expect(page).toContain(image);
    expect(page).not.toContain("data-inline-edit");
    expect(inviteScript(blocks, TUSCANY_TEMPLATE.theme, "Оливия и Даниэль")).toContain("tuscany-motion");
  });

  it("помечает фотографии, палитру, карту и программу для редактора", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, null, null, new Date("2027-11-15T14:00:00Z"), TUSCANY_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(body).toContain("data-inline-edit");
    expect(body).toContain("data-image-edit");
    expect(body).toContain("data-link-edit");
    expect(body).toContain("data-color-edit");
    expect(body).toContain('data-path="buttonLabel"');
    expect(body).toContain('data-block-action="add-detail"');
    expect(body).toContain('data-block-action="remove-detail"');
  });

  it("пустые фотографии можно вернуть только из редактора", () => {
    const blocks = templateBlocks();
    const cover = blocks.find((block) => block.type === "COVER")!;
    cover.content = { ...cover.content, imageUrl: "" };
    const venue = blocks.find((block) => block.type === "VENUE")!;
    venue.content = { ...venue.content, imageUrl: "" };
    const photos = blocks.find((block) => block.type === "PHOTOS")!;
    photos.content = { ...photos.content, items: [] };
    const edited = renderBlocks(blocks, null, null, new Date("2027-11-15T14:00:00Z"), TUSCANY_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(edited).toContain("Добавить фотографию пары");
    expect(edited).toContain("Добавить фотографию локации");
    expect(edited).toContain("Добавить фотографию");
    const guest = renderBlocks(blocks, null, null, new Date("2027-11-15T14:00:00Z"), TUSCANY_TEMPLATE.theme, "Europe/Rome");
    expect(guest).not.toContain("Добавить фотографию");
  });
});
