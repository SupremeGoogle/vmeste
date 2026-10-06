import { describe, expect, it } from "vitest";
import { readBlockContent } from "@/lib/invite-blocks";
import { inviteImageSlots } from "@/lib/invite-image-slots";
import { INVITE_TEMPLATES } from "@/lib/invite-templates";
import type { InviteBlockView } from "@/server/repositories/invites";

describe("фотографии приглашений", () => {
  it("собирает фотографии из всех стартовых шаблонов в общий список", () => {
    for (const template of INVITE_TEMPLATES) {
      const blocks: InviteBlockView[] = template.blocks.map((block, index) => ({
        id: `block${index}`, type: block.type, order: index, visible: true,
        ...readBlockContent(block.type, block.content),
      }));
      const listed = new Set(inviteImageSlots(blocks).map((slot) => slot.url));
      for (const block of blocks) {
        const content = block.content as Record<string, unknown>;
        const urls = [
          content.imageUrl,
          ...((content.photos as { imageUrl: string }[] | undefined) ?? []).map((photo) => photo.imageUrl),
          ...((content.items as { imageUrl?: string }[] | undefined) ?? []).map((item) => item.imageUrl),
        ];
        for (const url of urls) if (typeof url === "string" && url.startsWith("/media/invite-")) {
          expect(listed.has(url), `${template.id}: ${url}`).toBe(true);
        }
      }
    }
  });
});
