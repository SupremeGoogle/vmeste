import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { PRISM_SAMPLE_IMAGES } from "@/lib/invite-templates/prism-assets";
import { PRISM_TEMPLATE } from "@/lib/invite-templates/prism";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

function templateBlocks(): InviteBlockView[] {
  return PRISM_TEMPLATE.blocks.map((block, index) => ({
    id: `prism-${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Призма", () => {
  it("зарегистрирован с цельной серией фотографий", () => {
    expect(findTemplate("prism")).toMatchObject({ id: PRISM_TEMPLATE.id, name: PRISM_TEMPLATE.name, theme: PRISM_TEMPLATE.theme, blocks: expect.arrayContaining(PRISM_TEMPLATE.blocks) });
    expect(PRISM_SAMPLE_IMAGES).toEqual([
      "/media/invite-prism/couple.webp",
      "/media/invite-prism/venue.webp",
      "/media/invite-prism/dinner.webp",
    ]);
    for (const block of PRISM_TEMPLATE.blocks) {
      expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
    }
  });

  it("рисует самостоятельный glass-editorial макет и его motion-слой", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, "/rsvp", null, new Date("2027-08-02T16:30:00Z"), PRISM_TEMPLATE.theme, "Europe/Rome");
    const script = inviteScript(blocks, PRISM_TEMPLATE.theme, "Лев и София");
    const page = invitePage({ title: "Призма", theme: PRISM_TEMPLATE.theme, body, script });
    expect(page).toContain('class="sheet prism"');
    expect(page).toContain("prism-sculpture");
    expect(page).toContain("prism-card-swap");
    expect(page).toContain("data-prism-stack");
    expect(page).toContain("data-prism-parallax");
    expect(page).toContain("/media/invite-prism/sculpture.webp");
    for (const image of PRISM_SAMPLE_IMAGES) expect(page).toContain(image);
    expect(script).toContain("prism-motion");
    expect(script).toContain("--prism-stack-scale");
    expect(script).not.toContain("<script>");
  });

  it("оставляет все точки редактирования доступными", () => {
    const body = renderBlocks(templateBlocks(), null, null, new Date("2027-08-02T16:30:00Z"), PRISM_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(body).toContain("data-inline-edit");
    expect(body).toContain("data-image-edit");
    expect(body).toContain("data-link-edit");
    expect(body).toContain("data-color-edit");
    expect(body).toContain('data-block-action="add-detail"');
    expect(body).toContain('data-block-action="remove-detail"');
  });
});

