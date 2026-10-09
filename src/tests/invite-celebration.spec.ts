import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import { INVITE_TEMPLATES, findTemplate } from "@/lib/invite-templates";
import { CELEBRATION_IDS, celebrationTemplate } from "@/lib/invite-templates/celebration";
import { CELEBRATION_SAMPLE_IMAGES } from "@/lib/invite-templates/celebration-assets";
import { readBlockContent } from "@/lib/invite-blocks";
import { weddingSchema } from "@/lib/invite-personalization";
import { hasTemplateIntro, invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import { SAMPLE_WISHLIST } from "@/server/guest-html/wishlist";
import type { InviteBlockView } from "@/server/repositories/invites";

const date = new Date("2027-09-12T13:00:00Z");
const blocksFor = (id: string): InviteBlockView[] => findTemplate(id)!.blocks.map((b, order) => ({ id: `${id}-${order}`, type: b.type, order, visible: b.visible !== false, ...readBlockContent(b.type, b.content) }));
function textOf(html: string) {
  const walk = (node: DefaultTreeAdapterTypes.Node): string => {
    if ("tagName" in node && ["style", "script"].includes(node.tagName)) return "";
    if ("value" in node) return node.value;
    return "childNodes" in node ? node.childNodes.map(walk).join(" ") : "";
  };
  return walk(parseFragment(html));
}

describe.each(CELEBRATION_IDS)("Complete invitation: %s", id => {
  it("keeps the common sections and original local assets available", () => {
    const blocks = blocksFor(id);
    for (const type of ["COVER", "CALENDAR", "COUNTDOWN", "TIMELINE", "VENUE", "DRESSCODE", "PHOTOS", "WISHLIST", "RSVP_FORM", "TEXT"]) expect(blocks.some(b => b.type === type), type).toBe(true);
    expect(blocks.find(b => b.type === "WISHLIST")?.visible).toBe(false);
    for (const path of CELEBRATION_SAMPLE_IMAGES.filter(path => path.startsWith(`/media/invite-${id}/`))) expect(existsSync(join(process.cwd(), "public", path))).toBe(true);
  });

  it("renders the entire sample and shared gift list in English", () => {
    const blocks = blocksFor(id).map(b => b.type === "WISHLIST" ? { ...b, visible: true } : b);
    const theme = { ...celebrationTemplate(id, "en").theme, wedding: weddingSchema.parse({ names: "Valeria and David", city: "Moscow", venueName: "The Garden", venueAddress: "12 Garden Street", mapUrl: "", deadline: "2027-08-12T20:59:00Z" }) };
    const html = renderBlocks(blocks, null, null, date, theme, "Europe/Moscow", { wishlist: SAMPLE_WISHLIST });
    expect(textOf(html)).not.toMatch(/[А-Яа-яЁё]/);
    expect(html).toContain("Your full name");
    expect(html).toContain("August 12, 2027");
    expect(html).toContain('data-locale="en"');
    expect(html).toContain('name="status"');
    expect(html).not.toContain("data-component-key");
  });

  it("preserves custom wording, photographs and hidden sections while translating sample copy", () => {
    const blocks = blocksFor(id);
    const cover = blocks.find(b => b.type === "COVER")!;
    cover.content = { ...cover.content, names: "Анна и Джон", subtitle: "Наш собственный текст", imageUrl: "https://example.com/our-photo.jpg" } as typeof cover.content;
    const venue = blocks.find(b => b.type === "VENUE")!;
    venue.visible = false;
    const original = JSON.stringify(blocks);
    const html = renderBlocks(blocks, null, null, date, celebrationTemplate(id, "en").theme);
    expect(textOf(html)).toContain("Наш собственный текст");
    expect(html).toContain("https://example.com/our-photo.jpg");
    expect(html).not.toContain(`data-content-block="${venue.id}"`);
    expect(JSON.stringify(blocks)).toBe(original);
  });
});

describe.each(INVITE_TEMPLATES)("Opening screen: $id", template => {
  it("can be opened or disabled without trapping scrolling", () => {
    const blocks = blocksFor(template.id);
    expect(hasTemplateIntro(template.id)).toBe(true);
    const script = inviteScript(blocks, { ...template.theme, introOff: true }, "Anna and John")!;
    expect(script).toContain(".click()");
    expect(script).toContain("document.body.style.overflow=''");
    const html = invitePage({ title: template.name, body: renderBlocks(blocks, null, null, date, template.theme), theme: { ...template.theme, introOff: true }, script });
    expect(html).toContain("display:none!important");
    expect(script).not.toMatch(/<script[^>]+src=/);
  });
});
