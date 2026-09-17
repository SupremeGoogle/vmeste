import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { PEARL_SAMPLE_IMAGES } from "@/lib/invite-templates/pearl-assets";
import { PEARL_TEMPLATE } from "@/lib/invite-templates/pearl";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

function templateBlocks(): InviteBlockView[] {
  return PEARL_TEMPLATE.blocks.map((block, index) => ({
    id: `pearl-${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Жемчуг", () => {
  it("зарегистрирован с одной локацией и двумя независимыми фотографиями", () => {
    expect(findTemplate("pearl")).toBe(PEARL_TEMPLATE);
    expect(PEARL_SAMPLE_IMAGES).toEqual([
      "/media/invite-pearl/couple.webp",
      "/media/invite-pearl/venue.webp",
    ]);
    expect(PEARL_TEMPLATE.blocks.filter((block) => block.type === "VENUE")).toHaveLength(1);
    expect(PEARL_TEMPLATE.blocks.filter((block) => block.type === "PHOTOS")).toHaveLength(0);
    for (const block of PEARL_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("рисует отдельный макет с ботаникой и анимациями", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, "/rsvp", null, new Date("2027-06-14T14:00:00Z"), PEARL_TEMPLATE.theme, "Europe/Rome");
    const page = invitePage({
      title: "Жемчуг",
      theme: PEARL_TEMPLATE.theme,
      body,
      script: inviteScript(blocks, PEARL_TEMPLATE.theme, "Клара и Жюльен"),
    });
    expect(page).toContain('class="sheet pearl"');
    expect(page).toContain("pearl-portrait");
    expect(page).toContain("pearl-venue-frame");
    expect(page).toContain("pearl-choice-row");
    expect(page).toContain("pearl-progress");
    expect(page).toContain("data-pearl-parallax");
    expect(page).toContain(PEARL_SAMPLE_IMAGES[0]);
    expect(page).toContain(PEARL_SAMPLE_IMAGES[1]);
    expect(page).not.toContain("data-inline-edit");
    expect(inviteScript(blocks, PEARL_TEMPLATE.theme, "Клара и Жюльен")).toContain("pearl-motion");
  });

  it("помечает все ключевые поля для визуального редактора", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, null, null, new Date("2027-06-14T14:00:00Z"), PEARL_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(body).toContain("data-inline-edit");
    expect(body).toContain("data-image-edit");
    expect(body).toContain("data-link-edit");
    expect(body).toContain("data-color-edit");
    expect(body).toContain('data-path="buttonLabel"');
    expect(body).toContain('data-block-action="add-detail"');
    expect(body).toContain('data-block-action="remove-detail"');
  });

  it("после удаления фото оставляет заменяемые места только в редакторе", () => {
    const blocks = templateBlocks();
    const cover = blocks.find((block) => block.type === "COVER")!;
    cover.content = { ...cover.content, imageUrl: "" };
    const venue = blocks.find((block) => block.type === "VENUE")!;
    venue.content = { ...venue.content, imageUrl: "" };
    const edited = renderBlocks(blocks, null, null, new Date("2027-06-14T14:00:00Z"), PEARL_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(edited).toContain("Добавить фотографию пары");
    expect(edited).toContain("Добавить фотографию локации");
    const guest = renderBlocks(blocks, null, null, new Date("2027-06-14T14:00:00Z"), PEARL_TEMPLATE.theme, "Europe/Rome");
    expect(guest).not.toContain("Добавить фотографию");
  });
});
