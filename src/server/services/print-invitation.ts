import type { Prisma } from "@/generated/prisma/client";
import type { EventContext } from "@/server/context";
import { readPrintDesignJson, writePrintDesignJson } from "@/server/repositories/print-design";
import { safePrintInvitation, type PrintInvitation } from "@/lib/print-invitation";
import { db } from "@/server/db";
import { readObject } from "@/server/storage/s3";
import sharp from "sharp";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function getSavedPrintInvitation(ctx: EventContext): Promise<PrintInvitation | null> {
  return safePrintInvitation(record(await readPrintDesignJson(ctx)).invitation);
}

export async function savePrintInvitation(ctx: EventContext, design: PrintInvitation): Promise<void> {
  const saved = record(await readPrintDesignJson(ctx));
  await writePrintDesignJson(ctx, { ...saved, invitation: design } as Prisma.InputJsonValue);
}

export type PrintInvitationPhoto = { data: Buffer; format: "jpg" };

/** Resolve only photos owned by this event. React PDF embeds JPEG/PNG, so stored WebP is converted for print. */
export async function loadPrintInvitationPhotos(ctx: EventContext, design: PrintInvitation): Promise<Record<string, PrintInvitationPhoto>> {
  const ids = [...new Set(design.layers.filter((layer) => layer.kind === "photo" && !layer.hidden).map((layer) => layer.assetId).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return {};
  const assets = await db.eventAsset.findMany({
    where: { eventId: ctx.eventId, orgId: ctx.orgId, id: { in: ids }, contentType: { startsWith: "image/" } },
    select: { id: true, storageKey: true },
  });
  if (assets.length !== ids.length) throw new Error("Одна из фотографий недоступна. Замените её в макете.");
  const entries = await Promise.all(assets.map(async (asset) => {
    const original = await readObject(asset.storageKey);
    const data = await sharp(original, { animated: false }).rotate().jpeg({ quality: 91, mozjpeg: true }).toBuffer();
    return [asset.id, { data, format: "jpg" as const }] as const;
  }));
  return Object.fromEntries(entries);
}
