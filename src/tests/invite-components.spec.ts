import { describe, expect, it, vi } from "vitest";
import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import { INVITE_TEMPLATES, findTemplate } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { inviteThemeSchema } from "@/lib/invite-theme";
import { renderBlocks } from "@/server/guest-html/invite-html";
import { composeInviteComponents } from "@/server/guest-html/invite-components";
import { INLINE_EDITOR_SCRIPT, editAttrs } from "@/server/guest-html/inline-editor";
import type { InviteBlockView } from "@/server/repositories/invites";

function elements(html: string) {
  const result: DefaultTreeAdapterTypes.Element[] = [];
  const visit = (node: DefaultTreeAdapterTypes.Node) => {
    if ("tagName" in node) result.push(node);
    if ("childNodes" in node) node.childNodes.forEach(visit);
  };
  visit(parseFragment(html));
  return result;
}
const attr = (node: DefaultTreeAdapterTypes.Element, key: string) => node.attrs.find(a => a.name === key)?.value;
const date = new Date("2027-09-12T13:00:00Z");
const blocksFor = (id: string) => findTemplate(id)!.blocks.map((b, order): InviteBlockView => ({ id: `block-${order}`, type: b.type, order, visible: b.visible !== false, ...readBlockContent(b.type, b.content) }));

describe.each(INVITE_TEMPLATES)("Самостоятельные элементы: $id", template => {
  it("размечает содержимое каждого видимого раздела и удаляет только выбранный заголовок", () => {
    const blocks = blocksFor(template.id);
    const html = renderBlocks(blocks, null, null, date, template.theme, "Europe/Kaliningrad", { editable: true });
    const nodes = elements(html);
    for (const node of nodes.filter(n => ["img", "svg", "iframe", "a", "label", "fieldset"].includes(n.tagName))) {
      let parent: DefaultTreeAdapterTypes.Node | null = node;
      let editorUi = false;
      while (parent && "tagName" in parent) {
        if (["data-editor-ui", "data-block-action", "data-link-edit", "data-editor-nav"].some(key => attr(parent as DefaultTreeAdapterTypes.Element, key) !== undefined)) editorUi = true;
        parent = parent.parentNode;
      }
      if (!editorUi) expect(attr(node, "data-invite-component"), `${node.tagName}: ${attr(node, "class") ?? ""}`).toBeTruthy();
    }
    const sections = nodes.filter(n => attr(n, "data-content-block"));
    for (const section of sections) {
      const id = attr(section, "data-content-block")!;
      expect(nodes.some(n => attr(n, "data-component-owner") === id && attr(n, "data-invite-component")), id).toBe(true);
    }
    const target = nodes.find(n => attr(n, "data-invite-component") === "field:title" && attr(n, "data-component-owner") !== blocks.find(b => b.type === "COVER")?.id);
    expect(target).toBeDefined();
    const owner = attr(target!, "data-component-owner")!;
    const theme = { ...template.theme, removedComponents: { [owner]: ["field:title"] } };
    const removed = renderBlocks(blocks, null, null, date, theme, "Europe/Kaliningrad", { editable: true });
    expect(elements(removed).find(n => attr(n, "data-invite-component") === "field:title" && attr(n, "data-component-owner") === owner)?.attrs).toContainEqual({ name: "data-component-removed", value: "true" });
    const guest = renderBlocks(blocks, null, null, date, theme, "Europe/Kaliningrad");
    expect(guest).not.toContain("data-invite-component");
    expect(guest).not.toContain("data-component-key");
    expect(guest).toContain('data-content-block="' + owner + '"');
    const title = (blocks.find(b => b.id === owner)?.content as { title: string })?.title;
    if (title) expect(guest).not.toContain(`>${title}</`);
  });
});

it("Gazette: удаляет всю кнопку маршрута и оставляет адрес, описание, карту и данные", () => {
  const template = findTemplate("gazette")!;
  const blocks = blocksFor("gazette");
  const venue = blocks.find(b => b.type === "VENUE")!;
  const before = JSON.stringify(blocks);
  const theme = { ...template.theme, removedComponents: { [venue.id]: ["link:mapUrl"] } };
  const guest = renderBlocks(blocks, null, null, date, theme);
  const c = venue.content as { mapUrl: string; address: string; note: string };
  expect(guest).not.toContain(`href="${c.mapUrl.replace(/&/g, "&amp;")}"`);
  expect(guest).toContain(c.address);
  expect(guest).toContain(c.note);
  expect(guest).toContain("<iframe");
  const editor = renderBlocks(blocks, null, null, date, theme, "UTC", { editable: true });
  expect(elements(editor).find(n => attr(n, "data-invite-component") === "link:mapUrl")?.attrs).toContainEqual({ name: "data-component-removed", value: "true" });
  expect(elements(editor).some(n => attr(n, "data-link-edit") !== undefined && attr(n, "data-block-id") === venue.id)).toBe(false);
  expect(JSON.stringify(blocks)).toBe(before);
});

it("удаление фото и подписи независимо; восстановление возвращает исходный HTML", () => {
  const template = findTemplate("gazette")!;
  const blocks = blocksFor("gazette");
  const cover = blocks.find(b => b.type === "COVER")!;
  const clock = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-10-07").getTime());
  try {
    const original = renderBlocks(blocks, null, null, date, template.theme);
    const removed = renderBlocks(blocks, null, null, date, { ...template.theme, removedComponents: { [cover.id]: ["field:imageUrl"] } });
    expect(removed).not.toContain('data-media-block="' + cover.id + '" data-media-path="imageUrl"');
    expect(removed).toContain("Двое. Одна история.");
    expect(renderBlocks(blocks, null, null, date, { ...template.theme, removedComponents: {} })).toBe(original);
  } finally { clock.mockRestore(); }
});

it("ключи самостоятельных кнопок устойчивы к смене текста, ссылки и перестановке разделов", () => {
  const theme = findTemplate("gazette")!.theme;
  const e = editAttrs("a", true);
  const html = (text: string, url: string) => `<section${e.section()}><p${e.text("note")}>${text}</p><a class="action" href="${url}">Открыть</a></section>`;
  const keys = (source: string) => elements(composeInviteComponents(source, [], theme, true)).map(n => attr(n, "data-invite-component")).filter(Boolean);
  expect(keys(html("Один", "https://example.com/one"))).toEqual(keys(html("Другой", "https://example.com/two")));
  expect(keys(`<section data-content-block="b"><p>Другой раздел</p></section>${html("Один", "https://example.com/one")}`).slice(-2)).toEqual(keys(html("Один", "https://example.com/one")));
});

it("не затрагивает код, стили, скрытые поля и кнопки редактора; скрипт редактора корректен", () => {
  const source = '<section data-content-block="b"><script>var a="<button>";</script><style>.x{content:"<p>"}</style><input type="hidden" name="token" value="123"><button data-editor-ui>Править</button><button data-block-action="add-detail">Добавить пункт</button><p>Текст</p></section>';
  const html = composeInviteComponents(source, [], findTemplate("gazette")!.theme, true);
  expect(html).toContain('<script>var a="<button>";</script>');
  expect(html).toContain('<style>.x{content:"<p>"}</style>');
  expect(html).toContain('<input type="hidden" name="token" value="123">');
  expect(html).toContain('<button data-editor-ui>Править</button>');
  expect(html).toContain('<button data-block-action="add-detail">Добавить пункт</button>');
  expect(() => new Function(INLINE_EDITOR_SCRIPT)).not.toThrow();
  expect(inviteThemeSchema.safeParse({ removedComponents: { b: ["../../bad"] } }).success).toBe(false);
  expect(inviteThemeSchema.safeParse({ removedComponents: { b: ["field:title", "link:mapUrl"] } }).success).toBe(true);
});
