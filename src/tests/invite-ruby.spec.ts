import { describe, expect, it } from "vitest";
import { parseBlockContent, readBlockContent } from "@/lib/invite-blocks";
import { findTemplate } from "@/lib/invite-templates";
import { RUBY_DECOR_IMAGES, RUBY_SAMPLE_IMAGES } from "@/lib/invite-templates/ruby-assets";
import { RUBY_TEMPLATE } from "@/lib/invite-templates/ruby";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

function templateBlocks(): InviteBlockView[] {
  return RUBY_TEMPLATE.blocks.map((block, index) => ({
    id: `ruby-${index}`,
    type: block.type,
    order: index,
    visible: true,
    ...readBlockContent(block.type, block.content),
  }));
}

describe("Рубин", () => {
  it("зарегистрирован с одной локацией и двумя независимыми фотографиями", () => {
    expect(findTemplate("ruby")).toBe(RUBY_TEMPLATE);
    expect(RUBY_SAMPLE_IMAGES).toEqual([
      "/media/invite-ruby/couple.webp",
      "/media/invite-ruby/venue.webp",
    ]);
    expect(RUBY_TEMPLATE.blocks.filter((block) => block.type === "VENUE")).toHaveLength(1);
    for (const block of RUBY_TEMPLATE.blocks) expect(parseBlockContent(block.type, block.content).ok, block.type).toBe(true);
  });

  it("рисует бордовый макет с розами и анимациями", () => {
    const blocks = templateBlocks();
    const body = renderBlocks(blocks, "/rsvp", null, new Date("2027-05-17T14:00:00Z"), RUBY_TEMPLATE.theme, "Europe/Rome");
    const page = invitePage({ title: "Рубин", theme: RUBY_TEMPLATE.theme, body, script: inviteScript(blocks, RUBY_TEMPLATE.theme, "Элеонора и Джеймс") });
    expect(page).toContain('class="sheet ruby"');
    expect(page).toContain("ruby-portrait");
    expect(page).toContain("ruby-rose");
    expect(page).toContain("ruby-seal");
    expect(page).toContain("ruby-progress");
    expect(page).toContain("data-ruby-parallax");
    for (const image of RUBY_SAMPLE_IMAGES) expect(page).toContain(image);
    for (const image of Object.values(RUBY_DECOR_IMAGES)) expect(page).toContain(image);
    const script = inviteScript(blocks, RUBY_TEMPLATE.theme, "Элеонора и Джеймс");
    expect(script).toContain("ruby-motion");
    expect(script).not.toContain("<script>");
  });

  it("даёт редактировать тексты, фотографии, карту, цвета и детали", () => {
    const body = renderBlocks(templateBlocks(), null, null, new Date("2027-05-17T14:00:00Z"), RUBY_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(body).toContain("data-inline-edit");
    expect(body).toContain("data-image-edit");
    expect(body).toContain("data-link-edit");
    expect(body).toContain("data-color-edit");
    expect(body).toContain('data-block-action="add-detail"');
    expect(body).toContain('data-block-action="remove-detail"');
  });

  it("показывает места для удалённых фотографий только в редакторе", () => {
    const blocks = templateBlocks();
    const cover = blocks.find((block) => block.type === "COVER")!;
    cover.content = { ...cover.content, imageUrl: "" };
    const venue = blocks.find((block) => block.type === "VENUE")!;
    venue.content = { ...venue.content, imageUrl: "" };
    const edited = renderBlocks(blocks, null, null, new Date("2027-05-17T14:00:00Z"), RUBY_TEMPLATE.theme, "Europe/Rome", { editable: true });
    expect(edited).toContain("Добавить фотографию пары");
    expect(edited).toContain("Добавить фотографию локации");
    const guest = renderBlocks(blocks, null, null, new Date("2027-05-17T14:00:00Z"), RUBY_TEMPLATE.theme, "Europe/Rome");
    expect(guest).not.toContain("Добавить фотографию");
  });
});
