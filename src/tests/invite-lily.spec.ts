import { describe, expect, it } from "vitest";
import { readBlockContent } from "@/lib/invite-blocks";
import { LILY_TEMPLATE } from "@/lib/invite-templates/lily";
import { renderLilyBlocks } from "@/server/guest-html/lily/markup";
import type { InviteBlockView } from "@/server/repositories/invites";

const blocks = LILY_TEMPLATE.blocks.map((block, order): InviteBlockView => ({ id: `lily-${order}`, type: block.type, order, visible: true, ...readBlockContent(block.type, block.content) }));
const details = blocks.filter((block) => block.type === "TEXT" && "tag" in block.content && block.content.tag === "Детали");
const timeline = blocks.find((block) => block.type === "TIMELINE")!;

describe("Лилия: временная линия и пожелания", () => {
  it("сохраняет порядок, идентификаторы и поля редактора при группировке и перестановке деталей", () => {
    const chosen = [details[2], details[0], timeline, details[1]];
    const html = renderLilyBlocks(chosen, LILY_TEMPLATE.theme, null, null, () => "", { editable: true });
    expect([...html.matchAll(/data-content-block="([^"]+)"/g)].map((match) => match[1])).toEqual(chosen.map((block) => block.id));
    for (const block of details) {
      expect(html).toContain(`data-inline-edit data-block-id="${block.id}" data-path="title"`);
      expect(html).toContain(`data-inline-edit data-block-id="${block.id}" data-path="text" data-multiline="true"`);
    }
    expect(html).toContain(`data-inline-edit data-block-id="${timeline.id}" data-path="items.3.note"`);
  });
  it("не теряет одиночную карточку и экранирует пользовательский текст", () => {
    const block: InviteBlockView = { ...details[0], ...readBlockContent("TEXT", { ...details[0].content, title: '<img src=x onerror="bad()">', text: "Мы & вы <script>bad()</script>" }) };
    const html = renderLilyBlocks([block], LILY_TEMPLATE.theme, null, null, () => "");
    expect(html).toContain("&lt;img");
    expect(html).toContain("Мы &amp; вы &lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain(`data-content-block="${block.id}"`);
  });
});
