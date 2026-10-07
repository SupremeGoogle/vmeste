import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/(guest)/g/[shortCode]/album/download/route";
import { identifyByEventSession } from "@/server/guest-access/identify";
import { findEventByShortCode } from "@/server/repositories/events";
import { db } from "@/server/db";
import { resetRateLimits } from "@/server/rate-limit";
import { unzipSync } from "fflate";

vi.mock("@/server/guest-access/identify", () => ({ identifyByEventSession: vi.fn() }));
vi.mock("@/server/repositories/events", () => ({ findEventByShortCode: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { event: { findFirst: vi.fn() }, photo: { findMany: vi.fn() } } }));
vi.mock("@/server/storage/s3", () => ({ getObject: vi.fn(async () => ({ contentType: "image/webp", bytes: 3, body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); controller.close(); } }) })) }));
const params = { params: Promise.resolve({ shortCode: "ALBUM" }) };
const request = () => new Request("http://localhost/g/ALBUM/album/download");
beforeEach(() => { vi.resetAllMocks(); resetRateLimits(); vi.useRealTimers(); });
async function setup(overrides = {}) {
  vi.mocked(findEventByShortCode).mockResolvedValue({ id: "event", orgId: "org", title: "Свадьба", slug: "slug", shortCode: "ALBUM", status: "PUBLISHED", eventDate: new Date("2026-09-30T16:00Z"), timezone: "Europe/Kaliningrad", venueName: null, photosEnabled: true, wishesEnabled: true, qrEntryOpen: false, ...overrides });
  vi.mocked(identifyByEventSession).mockResolvedValue({ orgId: "org", eventId: "event", guestId: "guest", displayName: "Анна", eventTitle: "Свадьба", photosEnabled: true, wishesEnabled: true });
  vi.mocked(db.event.findFirst).mockResolvedValue({ albumEnabled: true } as never);
  vi.mocked(db.photo.findMany).mockResolvedValue([{ id: "photo", storageKey: "one" }] as never);
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-01T10:00Z"));
}
describe("доступ к архиву альбома", () => {
  it("не читает снимки без гостевой сессии", async () => {
    await setup(); vi.mocked(identifyByEventSession).mockResolvedValue(null);
    expect((await GET(request(), params)).status).toBe(401);
    expect(db.photo.findMany).not.toHaveBeenCalled();
  });
  it("не даёт скачать альбом до открытия или после отключения", async () => {
    await setup(); vi.setSystemTime(new Date("2026-09-30T21:59:59Z"));
    expect((await GET(request(), params)).status).toBe(403);
    vi.setSystemTime(new Date("2026-10-01T10:00Z")); vi.mocked(db.event.findFirst).mockResolvedValue({ albumEnabled: false } as never);
    expect((await GET(request(), params)).status).toBe(403);
    expect(db.photo.findMany).not.toHaveBeenCalled();
  });
  it("отдаёт гостю ZIP только с одобренными снимками мероприятия", async () => {
    await setup(); const result = await GET(request(), params);
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(db.photo.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { eventId: "event", status: "APPROVED" } }));
    const files = unzipSync(new Uint8Array(await result.arrayBuffer()));
    expect(files["photo-0001-photo.webp"]).toEqual(new Uint8Array([1, 2, 3]));
  });
  it("не открывает архив чужого или архивного события", async () => {
    await setup(); vi.mocked(findEventByShortCode).mockResolvedValue(null);
    expect((await GET(request(), params)).status).toBe(404);
    expect(identifyByEventSession).not.toHaveBeenCalled();
  });
});
