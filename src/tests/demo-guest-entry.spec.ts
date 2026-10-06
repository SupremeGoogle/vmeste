import { describe, expect, it } from "vitest";
import { lookupDemoGuest } from "@/lib/demo-guest-entry";
import { POST } from "@/app/api/demo/guest-entry/lookup/route";
import { GET } from "@/app/api/demo/guest-entry/qr/route";

describe("пример настоящей страницы гостя", () => {
  it("находит домашнее имя и показывает выбор для одинаковых имён", () => {
    expect(lookupDemoGuest("Настя")).toMatchObject({ status: "ok", matches: [{ displayName: "Анастасия Орлова", tableLabel: "Стол 3" }] });
    expect(lookupDemoGuest("Саша")).toMatchObject({ status: "ok", matches: [{ displayName: "Александр Крылов" }, { displayName: "Александра Белова" }] });
  });

  it("понимает фамилию, регистр и транслитерацию", () => {
    expect(lookupDemoGuest("  СОКОЛОВА ")).toMatchObject({ status: "ok", matches: [{ displayName: "Ирина Соколова" }] });
    expect(lookupDemoGuest("Anastasiya")).toMatchObject({ status: "ok", matches: [{ displayName: "Анастасия Орлова" }] });
    expect(lookupDemoGuest("Я")).toEqual({ status: "too_short" });
    expect(lookupDemoGuest("Несуществующий")).toEqual({ status: "not_found" });
  });

  it("обрабатывает некорректный запрос без доступа к базе", async () => {
    const response = await POST(new Request("https://vmeste.test/api/demo/guest-entry/lookup", { method: "POST", body: "не json" }));
    expect(response.status).toBe(400);
    const found = await POST(new Request("https://vmeste.test/api/demo/guest-entry/lookup", { method: "POST", body: JSON.stringify({ query: "Ира" }) }));
    expect(await found.json()).toMatchObject({ status: "ok", matches: [{ displayName: "Ирина Соколова" }] });
  });

  it("создаёт настоящий QR для страницы на текущем домене", async () => {
    const response = await GET(new Request("https://vmeste.test/api/demo/guest-entry/qr"));
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(await response.text()).toContain("<svg");
  });
});
