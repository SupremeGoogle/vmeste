import type { InviteBlockView } from "@/server/repositories/invites";
import { defaultPhotoAdjustment, photoAdjustmentSchema, type PhotoAdjustment } from "@/lib/invite-personalization";

export type InviteImageSlot = {
  blockId: string;
  path: string;
  label: string;
  url: string;
  settings: PhotoAdjustment;
};

/** One place to find every photograph stored in invitation blocks. */
export function inviteImageSlots(blocks: InviteBlockView[]): InviteImageSlot[] {
  const slots: InviteImageSlot[] = [];
  for (const block of blocks) {
    if (!["COVER", "VENUE", "PHOTOS", "DRESSCODE"].includes(block.type)) continue;
    const content = block.content as Record<string, unknown>;
    const adjustments = (content.photoSettings ?? {}) as Record<string, unknown>;
    const title = typeof content.title === "string" && content.title.trim() ? content.title.trim() : "Фотографии";
    const add = (path: string, label: string, url: unknown) => {
      const parsed = photoAdjustmentSchema.safeParse(adjustments[path]);
      slots.push({ blockId: block.id, path, label, url: typeof url === "string" ? url : "", settings: parsed.success ? parsed.data : defaultPhotoAdjustment() });
    };
    if (block.type === "COVER") add("imageUrl", "Обложка · Главное фото", content.imageUrl);
    if (block.type === "VENUE") add("imageUrl", "Место торжества · Фото площадки", content.imageUrl);
    if (block.type === "DRESSCODE" && content.imageUrl) add("imageUrl", "Дресс-код · Примеры нарядов", content.imageUrl);
    if (block.type === "COVER" && Array.isArray(content.photos)) {
      content.photos.slice(0, 4).forEach((item, index) => add(`photos.${index}.imageUrl`, `Обложка · Дополнительное фото ${index + 1}`, (item as { imageUrl?: unknown }).imageUrl));
    }
    if (block.type === "PHOTOS" && Array.isArray(content.items)) {
      content.items.slice(0, 4).forEach((item, index) => add(`items.${index}.imageUrl`, `${title} · Фото ${index + 1}`, (item as { imageUrl?: unknown }).imageUrl));
    }
  }
  return slots;
}
