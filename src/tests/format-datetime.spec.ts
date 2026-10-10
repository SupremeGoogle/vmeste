/** Дата и время по часам площадки — и полдень/полночь по-английски с AM/PM. */
import { describe, expect, it } from "vitest";
import { formatEventDateTime } from "@/lib/format-datetime";

const at = (iso: string) => new Date(iso);

describe("дата и время мероприятия", () => {
  it("по-русски — 24 часа по поясу площадки", () => {
    expect(formatEventDateTime(at("2026-09-12T10:00:00Z"), "Europe/Moscow")).toBe("суббота, 12 сентября 2026, 13:00");
    expect(formatEventDateTime(at("2026-09-12T21:00:00Z"), "Europe/Moscow")).toBe("воскресенье, 13 сентября 2026, 00:00");
  });

  it("по-английски — 12 часов с AM/PM: полночь, полдень, 13:00", () => {
    expect(formatEventDateTime(at("2026-09-12T10:00:00Z"), "Europe/Moscow", "en")).toBe("Saturday, September 12, 2026, 1:00 PM");
    expect(formatEventDateTime(at("2026-09-12T09:00:00Z"), "Europe/Moscow", "en")).toBe("Saturday, September 12, 2026, 12:00 PM");
    expect(formatEventDateTime(at("2026-09-12T21:00:00Z"), "Europe/Moscow", "en")).toBe("Sunday, September 13, 2026, 12:00 AM");
  });

  it("пояс площадки, а не сервера", () => {
    expect(formatEventDateTime(at("2026-09-12T10:00:00Z"), "Asia/Vladivostok", "en")).toBe("Saturday, September 12, 2026, 8:00 PM");
  });
});
