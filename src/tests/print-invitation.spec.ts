import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyPrintInviteTemplate, makePrintInvitation, PRINT_INVITE_DECOR, PRINT_INVITE_TEMPLATES,
  printInvitationSchema, safePrintInvitation,
} from "@/lib/print-invitation";

const seed = { names: "Анна и Михаил", date: "20 июня 2027 года", venue: "Усадьба Сосновый бор", address: "Москва, Лесная улица, 15" };

describe("печатные приглашения", () => {
  it("каждый из шести оригинальных макетов готов к экспорту на двух сторонах", () => {
    const placements = new Set<string>();
    for (const template of PRINT_INVITE_TEMPLATES) {
      const design = makePrintInvitation(seed, template.id);
      expect(printInvitationSchema.safeParse(design).success, template.id).toBe(true);
      expect(design.layers.some((layer) => layer.page === 0 && layer.text === seed.names)).toBe(true);
      expect(design.layers.some((layer) => layer.page === 1 && layer.text.includes(seed.address))).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", "media", "invite-print", template.art)), template.art).toBe(true);
      const names = design.layers.find((layer) => layer.id === "names")!;
      placements.add(`${names.x}/${names.w}/${names.y}/${names.fontSize}/${names.align}`);
    }
    expect(placements.size).toBe(6);
    for (const decor of PRINT_INVITE_DECOR) {
      expect(existsSync(path.join(process.cwd(), "public", "media", "invite-print", decor.file)), decor.file).toBe(true);
    }
  });

  it("при смене оформления сохраняет написанный текст и добавленные элементы", () => {
    const original = makePrintInvitation(seed, "gold");
    const custom = { ...original.layers[0], id: "custom-101", text: "Наш особенный день", x: 22, y: 13 };
    const edited = { ...original, layers: [...original.layers.map((layer) => layer.id === "message" ? { ...layer, text: "Ждём вас рядом!" } : layer), custom] };
    const switched = applyPrintInviteTemplate(edited, "rose", seed);
    expect(switched.layers.find((layer) => layer.id === "message")?.text).toBe("Ждём вас рядом!");
    expect(switched.layers.find((layer) => layer.id === "custom-101")?.text).toBe("Наш особенный день");
    expect(switched.layers.find((layer) => layer.id === "names")?.x).not.toBe(original.layers.find((layer) => layer.id === "names")?.x);
    expect(printInvitationSchema.safeParse(switched).success).toBe(true);
  });

  it("отклоняет элементы, выходящие за край печатной страницы", () => {
    const design = makePrintInvitation(seed);
    const invalid = { ...design, layers: design.layers.map((layer) => layer.id === "names" ? { ...layer, y: 95 } : layer) };
    expect(safePrintInvitation(invalid)).toBeNull();
  });

  it("сохраняет добавленное фото при смене оформления и проверяет его источник", () => {
    const base = makePrintInvitation(seed, "gold");
    const photo = { ...base.layers[0], id: "photo-301", kind: "photo" as const, assetId: "ckprintphoto12345", fit: "cover" as const, shape: "rounded" as const, x: 23, y: 37, w: 40, h: 28, hidden: false };
    const withPhoto = { ...base, layers: [...base.layers, photo] };
    expect(printInvitationSchema.safeParse(withPhoto).success).toBe(true);
    expect(applyPrintInviteTemplate(withPhoto, "lilac", seed).layers.find((layer) => layer.id === photo.id)).toMatchObject({ assetId: photo.assetId, x: 23, y: 37 });
    expect(safePrintInvitation({ ...withPhoto, layers: [...base.layers, { ...photo, assetId: undefined }] })).toBeNull();
  });
});
