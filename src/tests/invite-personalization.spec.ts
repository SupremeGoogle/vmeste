import { describe, expect, it } from "vitest";
import { INVITE_TEMPLATES } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { defaultPhotoAdjustment, fromLocalInput, personalizeBlocks, toLocalInput, weddingSchema, invitationWarnings } from "@/lib/invite-personalization";
import { renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

const wedding = weddingSchema.parse({ names: "Александра и Константин", city: "Калининград", venueName: "Наш ресторан", venueAddress: "Наш адрес", mapUrl: "https://maps.example.com/place", deadline: "2027-06-01T20:59:00.000Z" });
const date = new Date("2027-07-11T14:00:00Z");

describe("персонализация всех шаблонов", () => {
  for (const template of INVITE_TEMPLATES) it(`${template.name}: свои данные, фотографии и безопасное кадрирование`, () => {
    const blocks: InviteBlockView[] = template.blocks.map((block, index) => ({ id: `b${index}`, type: block.type, order: index, visible: true, ...readBlockContent(block.type, block.content) }));
    const venue = blocks.find((b) => b.type === "VENUE")!;
    venue.content = readBlockContent("VENUE", { ...venue.content, imageUrl: "https://images.example.com/venue.jpg", photoSettings: { imageUrl: { ...defaultPhotoAdjustment(), x: 20, y: 80, zoom: 1.2 } } }).content;
    const original = JSON.stringify(blocks);
    const theme = { ...template.theme, wedding };
    const html = renderBlocks(blocks, null, null, date, theme, "Europe/Kaliningrad");
    expect(html).toContain("Наш ресторан");
    expect(html).toContain("Наш адрес");
    expect(html).toContain("Александра");
    expect(html).toContain("Константин");
    expect(html).toContain("https://images.example.com/venue.jpg");
    expect(html).toContain("object-position:20% 80%!important");
    expect(html).toContain("https://maps.example.com/place");
    expect(html).not.toContain("data-image-edit");
    expect(JSON.stringify(blocks)).toBe(original);
    if (["ruby", "tuscany"].includes(template.id)) expect(html).toContain("А · К");
    if (template.id === "prism") expect(html).toContain("<span>А</span> / <span>К</span>");
    const editor = renderBlocks(blocks, null, null, date, theme, "Europe/Kaliningrad", { editable: true });
    expect(editor).toContain("data-photo-settings");
    expect(editor).toContain("data-image-edit");
  });

  it("отключение детских фото не удаляет оригиналы и не показывает чужие снимки", () => {
    const template = INVITE_TEMPLATES.find((t) => t.id === "tili")!;
    const block: InviteBlockView = { id: "cover", type: "COVER", order: 0, visible: true, ...readBlockContent("COVER", template.blocks[0].content) };
    const result = personalizeBlocks([block], { ...template.theme, wedding: { ...wedding, childhood: false } }, date);
    expect((result[0].content as {photos: unknown[]}).photos).toHaveLength(0);
    expect((block.content as {photos: unknown[]}).photos).toHaveLength(2);
  });

  it("проверяет реальные даты и переводит время площадки в UTC", () => {
    expect(fromLocalInput("2027-02-30T12:00", "Europe/Kaliningrad")).toBeNull();
    const parsed = fromLocalInput("2027-07-11T16:00", "Europe/Kaliningrad")!;
    expect(parsed.toISOString()).toBe("2027-07-11T14:00:00.000Z");
    expect(toLocalInput(parsed, "Europe/Kaliningrad")).toBe("2027-07-11T16:00");
  });

  it("сигнализирует о примерах и пропущенном адресе", () => {
    const template = INVITE_TEMPLATES.find((t) => t.id === "silk")!;
    const blocks = template.blocks.map((b, i) => ({ id: `b${i}`, type: b.type, order: i, visible: true, ...readBlockContent(b.type, b.content) }));
    const warnings = invitationWarnings(blocks, { ...template.theme, wedding: { ...wedding, venueAddress: "" } });
    expect(warnings.join(" ")).toContain("фотографии-примеры");
    expect(warnings.join(" ")).toContain("адрес");
  });
});
