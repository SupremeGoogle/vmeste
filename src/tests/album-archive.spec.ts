import { beforeEach, describe, expect, it, vi } from "vitest";
import { unzipSync } from "fflate";
import { photoArchive } from "@/server/services/album";
import { getObject } from "@/server/storage/s3";

vi.mock("@/server/storage/s3", () => ({ getObject: vi.fn() }));
beforeEach(() => vi.mocked(getObject).mockReset());
function object(content: string) {
  const data = new TextEncoder().encode(content);
  return { contentType: "image/webp", bytes: data.length, body: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(data.slice(0, 2)); controller.enqueue(data.slice(2)); controller.close(); } }) };
}
describe("архив альбома", () => {
  it("собирает читаемый ZIP со всеми оригиналами", async () => {
    vi.mocked(getObject).mockImplementation(async (key) => object(key));
    const bytes = new Uint8Array(await new Response(photoArchive([{ id: "a", storageKey: "one" }, { id: "b", storageKey: "two" }])).arrayBuffer());
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toEqual(["photo-0001-a.webp", "photo-0002-b.webp"]);
    expect(new TextDecoder().decode(files["photo-0001-a.webp"])).toBe("one");
    expect(new TextDecoder().decode(files["photo-0002-b.webp"])).toBe("two");
  });
  it("не читает альбом целиком заранее и прекращает чтение при отмене", async () => {
    vi.mocked(getObject).mockImplementation(async (key) => object(key));
    const stream = photoArchive([{ id: "a", storageKey: "one" }, { id: "b", storageKey: "two" }]);
    const reader = stream.getReader();
    await reader.read();
    await reader.cancel();
    expect(getObject).toHaveBeenCalledTimes(1);
  });
  it("не выдаёт тихо неполный архив при отсутствии файла", async () => {
    vi.mocked(getObject).mockResolvedValue(null);
    await expect(new Response(photoArchive([{ id: "gone", storageKey: "missing" }])).arrayBuffer()).rejects.toThrow("недоступен");
  });
});
