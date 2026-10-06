import { afterEach, describe, expect, it, vi } from "vitest";
import { isAutoMapUrl, resolveVenueMapUrl, yandexPointUrl } from "@/server/geocode";

afterEach(() => vi.unstubAllGlobals());

function stubGeocoder(lat: string, lon: string) {
  const fetch = vi.fn(async () => new Response(JSON.stringify([{ lat, lon }]), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("точка на карте по адресу", () => {
  it("свою ссылку организатора не трогает и в геокодер не ходит", async () => {
    const fetch = stubGeocoder("1", "2");
    const own = "https://yandex.ru/maps/org/usadba/123/";
    expect(await resolveVenueMapUrl({ mapUrl: own, name: "Усадьба", address: "Новый адрес" }, { name: "Усадьба", address: "" })).toBe(own);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("без ссылки находит точку и помечает её как найденную автоматически", async () => {
    stubGeocoder("55.9485", "38.0878");
    const url = await resolveVenueMapUrl({ mapUrl: "", name: "Усадьба Гребнево", address: "" });
    expect(url).toBe(yandexPointUrl(55.9485, 38.0878));
    expect(isAutoMapUrl(url)).toBe(true);
  });

  it("найденную раньше точку пересчитывает, только когда место поменялось", async () => {
    const auto = yandexPointUrl(10, 20);
    const fetch = stubGeocoder("30", "40");
    const place = { name: "Усадьба", address: "Щёлково" };
    expect(await resolveVenueMapUrl({ mapUrl: auto, ...place }, place)).toBe(auto);
    expect(fetch).not.toHaveBeenCalled();
    expect(await resolveVenueMapUrl({ mapUrl: auto, ...place, address: "Москва" }, place)).toBe(yandexPointUrl(30, 40));
  });

  it("если геокодер недоступен, сохраняет без точки, а не падает", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await resolveVenueMapUrl({ mapUrl: "", name: "Усадьба", address: "Щёлково" })).toBe("");
  });
});
