/** Уведомления владельцу: одна поломка не заливает чат, «не найдено» — не поломка. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: string[] = [];
vi.mock("@/server/notify/telegram", () => ({
  telegramConfigured: () => true,
  notifyOwner: vi.fn(async (text: string) => { sent.push(text); return true; }),
}));

const { notifyGuestError, notifyServerError } = await import("@/server/notify/events");

beforeEach(() => { sent.length = 0; });

describe("уведомления владельцу", () => {
  it("одинаковая ошибка сервера приходит один раз, другая — отдельно", () => {
    for (let i = 0; i < 50; i++) notifyServerError(new Error("db down"), "GET /i/x (route)");
    notifyServerError(new Error("другое"), "GET /i/x (route)");
    expect(sent).toHaveLength(2);
    expect(sent[0]).toContain("db down");
  });

  it("not-found и редиректы Next не шлются", () => {
    notifyServerError(new Error("NEXT_NOT_FOUND"), "GET /x");
    notifyServerError(new Error("NEXT_REDIRECT;replace;/login"), "GET /app");
    expect(sent).toHaveLength(0);
  });

  it("ошибка в браузере гостя — с шаблоном и страницей, тоже без повторов", () => {
    notifyGuestError("x is undefined", "https://site/i/anya", "tili");
    notifyGuestError("x is undefined", "https://site/i/anya", "tili");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("tili");
  });
});
