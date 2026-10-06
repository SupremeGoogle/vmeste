/**
 * Обложка организатора, которую фильтр счёл откровенной, не принимается:
 * модерации у неё нет, а видит её каждый гость. Сам классификатор здесь
 * подменён — проверяется реакция загрузки на высокую оценку.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/server/images/nsfw", () => ({
  NSFW_FLAG: 0.6,
  NSFW_BLOCK: 0.9,
  nsfwScore: vi.fn(async () => 0.97),
}));

import { testDb, resetDb } from "./helpers/db";
import { completeAssetUpload, listAssets, startAssetUpload } from "@/server/services/assets";
import { getObject } from "@/server/storage/s3";
import type { EventContext } from "@/server/context";

let ctx: EventContext;

beforeEach(async () => {
  await resetDb();
  const org = await testDb.organization.create({ data: { name: "nsfw", slug: "nsfw-org" } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: "nsfw", slug: "nsfw-event", shortCode: "NSFWEV",
      eventDate: new Date("2026-08-15T13:00:00Z"),
    },
  });
  ctx = { kind: "org", role: "OWNER", orgId: org.id, userId: "u1", eventId: event.id };
});
afterAll(resetDb);

describe("фильтр 18+ для картинок организатора", () => {
  it("откровенную картинку отклоняет и убирает из хранилища", async () => {
    const file = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#b88" } })
      .jpeg().toBuffer();
    const started = await startAssetUpload(ctx, "image/jpeg", file.byteLength);
    if (!started.ok) throw new Error(started.message);
    await fetch(started.uploadUrl, {
      method: "PUT", headers: { "content-type": "image/jpeg" }, body: new Uint8Array(file),
    });

    const done = await completeAssetUpload(ctx, started.key, "");
    expect(done.ok).toBe(false);
    if (!done.ok) expect(done.message).toContain("откровенную");
    expect(await getObject(started.key)).toBeNull();
    expect(await listAssets(ctx)).toHaveLength(0);
  });
});
