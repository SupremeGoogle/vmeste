import { describe, expect, it } from "vitest";
import { findTemplate } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { hasTemplateIntro, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const template = findTemplate("vinyl")!;
const blocks: InviteBlockView[] = template.blocks.map((block, index) => ({ id: `v${index}`, type: block.type, order: index, visible: true, ...readBlockContent(block.type, block.content) }));

describe("заставка «Винила»", () => {
  it("выключается в редакторе, как у остальных шаблонов с заставкой", () => {
    expect(hasTemplateIntro("vinyl")).toBe(true);
  });

  it("подпись заставки — редактируемая подпись шаблона", () => {
    const theme = { ...template.theme, labels: { "vinyl.intro": "Коснитесь пластинки" } };
    const guest = renderBlocks(blocks, null, null, undefined, theme, "Europe/Moscow");
    expect(guest).toContain('id="vinyl-intro-copy" hidden');
    expect(guest).toContain("Коснитесь пластинки");

    const editor = renderBlocks(blocks, null, null, undefined, theme, "Europe/Moscow", { editable: true });
    expect(editor).toContain("vinyl-intro-preview");
    expect(editor).toContain('data-path="label:vinyl.intro"');
  });

  it("без заставки — ни превью, ни подписи", () => {
    const theme = { ...template.theme, introOff: true };
    expect(renderBlocks(blocks, null, null, undefined, theme, "Europe/Moscow", { editable: true })).not.toContain("vinyl-intro-preview");
    expect(renderBlocks(blocks, null, null, undefined, theme, "Europe/Moscow")).not.toContain("vinyl-intro-copy");
  });
});
