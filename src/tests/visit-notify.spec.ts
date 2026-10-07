/** Уведомления о новых посетителях: роботы, повторы, токены, потолок в час. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: string[] = [];
vi.mock("@/server/notify/telegram", () => ({
  telegramConfigured: () => true,
  notifyOwner: async (text: string) => { sent.push(text); return true; },
}));

const { recordVisit, resetVisitState, maskPath, deviceOf, sourceOf, VISITS_PER_HOUR } = await import("@/server/notify/visits");

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const visit = (address: string, extra: Partial<Parameters<typeof recordVisit>[0]> = {}) => ({
  path: "/", referrer: "", userAgent: IPHONE, address, ownHost: "vvvmeste.com", ...extra,
});

beforeEach(() => { resetVisitState(); sent.length = 0; });
afterEach(() => { delete process.env.VISIT_NOTIFY; });

describe("новый посетитель", () => {
  it("пишет один раз на человека, роботов пропускает", () => {
    expect(recordVisit(visit("1.1.1.1", { referrer: "https://www.instagram.com/x" }))).toBe("sent");
    expect(recordVisit(visit("1.1.1.1"))).toBe("repeat");
    expect(recordVisit(visit("2.2.2.2", { userAgent: "TelegramBot (like TwitterBot)" }))).toBe("bot");
    expect(recordVisit(visit("3.3.3.3", { userAgent: "" }))).toBe("bot");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("Главная");
    expect(sent[0]).toContain("instagram.com");
    expect(sent[0]).toContain("iPhone · Safari");
  });

  it("токен именной ссылки в сообщение не попадает", () => {
    expect(maskPath("/i/anya-misha/SECRETTOKEN123?x=1")).toBe("/i/anya-misha/…");
    recordVisit(visit("4.4.4.4", { path: "/i/anya-misha/SECRETTOKEN123" }));
    expect(sent[0]).not.toContain("SECRETTOKEN123");
    expect(sent[0]).toContain("Именное приглашение");
  });

  it("сверх потолка в час — молчит, потом присылает сводку", () => {
    const start = 1_000_000_000_000;
    for (let i = 0; i < VISITS_PER_HOUR + 5; i++) recordVisit(visit(`10.0.0.${i}`), start + i);
    expect(sent).toHaveLength(VISITS_PER_HOUR);
    recordVisit(visit("9.9.9.9"), start + 2 * 3600_000);
    expect(sent.some((text) => text.includes("ещё новых посетителей: 5"))).toBe(true);
  });

  it("можно выключить переменной", () => {
    process.env.VISIT_NOTIFY = "0";
    expect(recordVisit(visit("5.5.5.5"))).toBe("off");
    expect(sent).toHaveLength(0);
  });

  it("источник и устройство", () => {
    expect(sourceOf("https://vvvmeste.com/app", "vvvmeste.com")).toBe("напрямую");
    expect(sourceOf("", "vvvmeste.com")).toBe("напрямую");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 YaBrowser/24.0 Safari/537.36")).toBe("Windows · Яндекс Браузер");
  });
});
