import { describe, expect, it } from "vitest";
import { albumIsOpen, albumOpeningLabel, dayCalendar, giftInput, localDateTime, localTimeToUtc } from "@/lib/wedding-day";

describe("свадебный день и часовой пояс", () => {
  const event = { eventDate: new Date("2026-09-30T16:00:00Z"), timezone: "Europe/Kaliningrad", albumEnabled: true, status: "PUBLISHED" };
  it("открывает альбом в полночь следующего дня по площадке", () => {
    expect(albumIsOpen(event, new Date("2026-09-30T21:59:59Z"))).toBe(false);
    expect(albumIsOpen(event, new Date("2026-09-30T22:00:00Z"))).toBe(true);
    expect(albumOpeningLabel(event)).toBe("1 октября 2026 г.");
    expect(albumIsOpen({ ...event, albumEnabled: false }, new Date("2026-10-01T12:00Z"))).toBe(false);
    expect(albumIsOpen({ ...event, status: "ARCHIVED" }, new Date("2026-10-01T12:00Z"))).toBe(false);
  });
  it("обрабатывает переход года и пояса впереди UTC", () => {
    const farEast = { ...event, eventDate: new Date("2026-12-31T06:00Z"), timezone: "Asia/Vladivostok" };
    expect(albumIsOpen(farEast, new Date("2026-12-31T14:00Z"))).toBe(true);
    expect(albumOpeningLabel(farEast)).toBe("1 января 2027 г.");
  });
  it("сохраняет 18:30 по площадке независимо от серверного пояса", () => {
    expect(localTimeToUtc("2026-09-30T18:30", "Europe/Kaliningrad")?.toISOString()).toBe("2026-09-30T16:30:00.000Z");
    expect(localTimeToUtc("2026-09-30T18:30", "Asia/Vladivostok")?.toISOString()).toBe("2026-09-30T08:30:00.000Z");
    expect(localDateTime(new Date("2026-09-30T22:00Z"), "Europe/Kaliningrad")).toBe("2026-10-01T00:00");
  });
  it("не принимает невозможные даты и время во время перехода DST", () => {
    expect(localTimeToUtc("2026-02-30T18:30", "Europe/Kaliningrad")).toBeNull();
    expect(localTimeToUtc("2026-03-29T02:30", "Europe/Berlin")).toBeNull();
    expect(localTimeToUtc("invalid", "Europe/Kaliningrad")).toBeNull();
    expect(localTimeToUtc("2026-03-29T03:30", "Europe/Berlin")?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });
  it("отклоняет исполняемые ссылки в подарках", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,bad", "//evil.example"]) expect(giftInput.safeParse({ title: "Подарок", description: "", url }).success).toBe(false);
    expect(giftInput.safeParse({ title: "Подарок", description: "", url: "https://example.com/gift" }).success).toBe(true);
  });
  it("экспортирует напоминания в календарь с экранированием и переносами RFC 5545", () => {
    const calendar = dayCalendar([{ id: "dance", title: "Первый танец, музыка; любовь", responsible: "Ведущий", notes: "а".repeat(100) + "\nВторая строка", startsAt: new Date("2026-09-30T16:30Z"), reminderMinutes: 10 }]);
    expect(calendar).toContain("DTSTART:20260930T163000Z\r\n");
    expect(calendar).toContain("TRIGGER:-PT10M");
    expect(calendar).toContain("SUMMARY:Первый танец\\, музыка\\; любовь");
    for (const line of calendar.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(calendar.replace(/\r\n /g, "")).toContain("\\nВторая строка");
  });
});

