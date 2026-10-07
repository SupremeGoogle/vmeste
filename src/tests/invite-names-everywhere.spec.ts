/**
 * Имена пары — везде, включая заставку: в каждом шаблоне после подстановки
 * не должно остаться имён из образца («Себастьян и София» и т. п.).
 */
import { describe, expect, it } from "vitest";
import { PICKABLE_TEMPLATES } from "@/lib/invite-templates";
import { invitePage, inviteScript, renderBlocks, coupleNames } from "@/server/guest-html/invite-html";
import { weddingSchema } from "@/lib/invite-personalization";
import { readBlockContent } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";

const NAMES = "Зоряна и Тихон";

function render(templateId: string) {
  const template = PICKABLE_TEMPLATES.find((item) => item.id === templateId)!;
  const blocks: InviteBlockView[] = template.blocks.map((block, index) => ({
    id: `b${index}`, type: block.type, order: index, visible: block.visible ?? true,
    content: readBlockContent(block.type, block.content).content, degraded: false,
  }));
  const theme = { ...template.theme, wedding: weddingSchema.parse({ names: NAMES, city: "", venueName: "", venueAddress: "", mapUrl: "" }) };
  const visible = blocks.filter((block) => block.visible);
  const body = renderBlocks(visible, null, null, new Date("2027-06-12T13:00:00Z"), theme, "Europe/Moscow");
  const script = inviteScript(visible, theme, coupleNames(visible, NAMES)) ?? "";
  return { html: invitePage({ title: NAMES, theme, body, script }), template };
}

/** Имена образца: из обложки шаблона, по словам длиннее двух букв. */
function sampleNames(templateId: string): string[] {
  const template = PICKABLE_TEMPLATES.find((item) => item.id === templateId)!;
  const cover = template.blocks.find((block) => block.type === "COVER");
  const names = String((cover?.content as { names?: string } | undefined)?.names ?? "");
  return names.split(/\s+|&|·/).map((word) => word.replace(/[^\p{L}]/gu, "")).filter((word) => word.length > 2 && !/^(и|and)$/i.test(word));
}

describe("имена пары во всех шаблонах", () => {
  it.each(PICKABLE_TEMPLATES.map((template) => template.id))("%s", (id) => {
    const { html } = render(id);
    const visibleText = html.replace(/<style[\s\S]*?<\/style>/g, "");
    const left = sampleNames(id).filter((word) => visibleText.includes(word));
    expect(left, `в шаблоне ${id} остались имена образца`).toEqual([]);
  });
});
