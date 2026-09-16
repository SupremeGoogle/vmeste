import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { EVERGREEN_TEMPLATE } from "@/lib/invite-templates/evergreen";
import { EVERGREEN_SAMPLE_IMAGES } from "@/lib/invite-templates/evergreen-assets";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import { renderEvergreenBlocks } from "@/server/guest-html/evergreen/markup";
import { EVERGREEN_EDITOR_SCRIPT } from "@/server/guest-html/evergreen/script";
import type { InviteBlockView } from "@/server/repositories/invites";

function templateBlocks(): InviteBlockView[] {
  return EVERGREEN_TEMPLATE.blocks.map((block, index) => ({
    id: `evergreen-${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Эвергрин", () => {
  it("зарегистрирован и содержит отдельные заменяемые изображения", () => {
    expect(findTemplate("evergreen")).toBe(EVERGREEN_TEMPLATE);
    expect(EVERGREEN_SAMPLE_IMAGES).toEqual([
      "/media/invite-evergreen/couple.webp",
      "/media/invite-evergreen/venue.webp",
      "/media/invite-evergreen/rings.webp",
      "/media/invite-evergreen/dinner.webp",
      "/media/invite-evergreen/dance.webp",
    ]);
    const cover = EVERGREEN_TEMPLATE.blocks.find((block) => block.type === "COVER")!;
    const gallery = EVERGREEN_TEMPLATE.blocks.find((block) => block.type === "PHOTOS")!;
    expect(parseBlockContent("COVER", cover.content).ok).toBe(true);
    expect(parseBlockContent("PHOTOS", gallery.content).ok).toBe(true);
  });

  it("рисует полноценную гостевую страницу без редакторских атрибутов", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, null, null, new Date("2027-10-18T14:00:00Z"), EVERGREEN_TEMPLATE.theme);
    const page = invitePage({ title: "Эвергрин", theme: EVERGREEN_TEMPLATE.theme, body, script: inviteScript(blocks, EVERGREEN_TEMPLATE.theme, "Александр и Елизавета") });
    expect(page).toContain('class="sheet evergreen"');
    expect(page).toContain(EVERGREEN_SAMPLE_IMAGES[0]);
    expect(page).toContain(EVERGREEN_SAMPLE_IMAGES[1]);
    expect(page).toContain(EVERGREEN_SAMPLE_IMAGES[4]);
    expect(page).toContain("eg-schedule");
    expect(page).toContain("eg-gallery-mosaic");
    expect(page).toContain("eg-scroll-vine");
    expect(page).toContain("eg-progress");
    expect(page).toContain("data-eg-parallax");
    expect(page).toContain("eg-journey-ring");
    expect(page).toContain("/media/invite-evergreen/flying-ring.webp");
    expect(inviteScript(blocks, EVERGREEN_TEMPLATE.theme, "Александр и Елизавета")).toContain("--eg-ring-y");
    expect(inviteScript(blocks, EVERGREEN_TEMPLATE.theme, "Александр и Елизавета")).toContain(".eg-intro");
    expect(page).not.toContain("Добавить деталь дня");
    expect(page).not.toContain("data-inline-edit");
  });

  it("в режиме конструктора размечает текст, изображения и управление разделами", () => {
    const blocks = templateBlocks();
    const body = renderEvergreenBlocks(blocks, EVERGREEN_TEMPLATE.theme, null, null, () => "", { editable: true });
    expect(body).toContain('data-inline-edit');
    expect(body).toContain('data-path="names"');
    expect(body).toContain('data-path="imageUrl"');
    expect(body).toContain('data-path="items.0.imageUrl"');
    expect(body).toContain('data-block-action="up"');
    expect(body).toContain('data-block-action="add-detail"');
    expect(body).toContain("Добавить деталь дня");
    expect(EVERGREEN_EDITOR_SCRIPT).toContain("postMessage");
  });

  it("экранирует редактируемый текст", () => {
    const blocks = templateBlocks();
    const text = blocks.find((block) => block.type === "TEXT")!;
    text.content = { ...text.content, title: "<img src=x onerror=alert(1)>" };
    const body = renderEvergreenBlocks([text], EVERGREEN_TEMPLATE.theme, null, null, () => "", { editable: true });
    expect(body).toContain("&lt;img");
    expect(body).not.toContain("<img src=x");
  });
});
