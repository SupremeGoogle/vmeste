import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { getObject } from "@/server/storage/s3";
import { Zip, ZipPassThrough } from "fflate";

export type AlbumScope = "all" | "mine" | "table";
export function albumScope(value?: string | null): AlbumScope {
  return value === "mine" || value === "table" ? value : "all";
}

/** «За моим столом» означает снимки, присланные гостями этого стола.
 * Не пытаемся определять людей на фотографии по лицам. */
export async function albumFilter(eventId: string, guestId: string, scope: AlbumScope): Promise<Prisma.PhotoWhereInput> {
  const base: Prisma.PhotoWhereInput = { eventId, status: "APPROVED" };
  if (scope === "mine") return { ...base, guestId };
  if (scope === "table") {
    const seat = await db.seat.findFirst({ where: { eventId, guestId }, select: { tableId: true } });
    if (!seat) return { ...base, id: { in: [] } };
    const seats = await db.seat.findMany({ where: { eventId, tableId: seat.tableId, guest: { archivedAt: null } }, select: { guestId: true } });
    return { ...base, guestId: { in: seats.flatMap((seat) => seat.guestId ? [seat.guestId] : []) } };
  }
  return base;
}

type ArchivePhoto = { id: string; storageKey: string };

/** ZIP без буферизации всего альбома: читается один фрагмент одного
 * снимка за pull. WebP уже сжат, дополнительное сжатие не нужно. */
export function photoArchive(photos: ArchivePhoto[]): ReadableStream<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let zipError: Error | null = null;
  const zip = new Zip((error, data) => {
    if (error) zipError = error;
    else if (data.length) chunks.push(data);
  });
  async function* generate() {
    try {
      for (const [index, photo] of photos.entries()) {
        const object = await getObject(photo.storageKey);
        if (!object) throw new Error(`Снимок ${photo.id} недоступен в хранилище`);
        const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" } as Record<string, string>)[object.contentType] ?? "webp";
        const entry = new ZipPassThrough(`photo-${String(index + 1).padStart(4, "0")}-${photo.id}.${extension}`);
        const reader = object.body.getReader();
        try {
          zip.add(entry);
          while (chunks.length) yield chunks.shift()!;
          while (true) {
            const { done, value } = await reader.read();
            entry.push(value ?? new Uint8Array(), done);
            if (zipError) throw zipError;
            while (chunks.length) yield chunks.shift()!;
            if (done) break;
          }
        } finally { await reader.cancel(); reader.releaseLock(); }
      }
      zip.end();
      if (zipError) throw zipError;
      while (chunks.length) yield chunks.shift()!;
    } finally { zip.terminate(); }
  }
  const iterator = generate();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) controller.close(); else controller.enqueue(value);
      } catch (error) { controller.error(error); }
    },
    async cancel() { await iterator.return(undefined); },
  });
}
