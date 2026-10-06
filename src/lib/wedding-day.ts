import { z } from "zod";

/** Серверный снимок времени для первого клиентского кадра плана. */
export async function currentPlanTime(): Promise<number> { return Date.now(); }

export const webUrl = z.string().trim().max(2000).refine((value) => {
  if (!value) return true;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "Укажите ссылку, начинающуюся с https:// или http://");

export const giftInput = z.object({
  title: z.string().trim().min(1, "Введите название подарка").max(160),
  description: z.string().trim().max(1000),
  url: webUrl,
  // Картинка — только из загруженных организатором (`/api/asset/...`);
  // что это картинка именно этого мероприятия, проверяет сервис.
  imageUrl: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === "" || /^\/api\/asset\/[\w-]+\/[\w-]+$/.test(value), "Выберите картинку из загруженных")
    .default(""),
});

export const envelopeInput = z.object({
  enabled: z.boolean(),
  label: z.string().trim().min(1, "Добавьте подпись для перевода").max(120),
  details: z.string().trim().max(2000),
  url: webUrl,
});

export const STEP_ACTIONS = {
  NONE: "Только отметить выполнение",
  SCREEN_PHOTOS: "Показать фотографии на экране",
  SCREEN_WISHES: "Показать пожелания на экране",
  SCREEN_MIXED: "Фото и пожелания на экране",
  RAFFLE: "Провести розыгрыш на экране",
} as const;

export const stepInput = z.object({
  title: z.string().trim().min(1, "Введите название этапа").max(160),
  responsible: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
  localTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Укажите дату и время"),
  reminderMinutes: z.coerce.number().int().min(0).max(1440),
  action: z.enum(["NONE", "SCREEN_PHOTOS", "SCREEN_WISHES", "SCREEN_MIXED", "RAFFLE"]),
  raffleId: z.string().max(100),
});

/** Дата площадки, независимо от пояса телефона и сервера. */
export function localDateTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

/** datetime-local → UTC; проверка обратным преобразованием ловит неверные
 * даты и время, которого нет при переходе на летнее время. */
export function localTimeToUtc(value: string, timezone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) return null;
  let utc = wall;
  for (let i = 0; i < 4; i++) {
    const displayed = Date.parse(`${localDateTime(new Date(utc), timezone)}:00Z`);
    utc += wall - displayed;
  }
  const result = new Date(utc);
  return localDateTime(result, timezone) === value ? result : null;
}

export function albumIsOpen(event: { eventDate: Date; timezone: string; albumEnabled: boolean; status: string }, now = new Date()): boolean {
  return event.albumEnabled && event.status !== "ARCHIVED" &&
    localDateTime(now, event.timezone).slice(0, 10) > localDateTime(event.eventDate, event.timezone).slice(0, 10);
}

export function albumOpeningLabel(event: { eventDate: Date; timezone: string }): string {
  const day = localDateTime(event.eventDate, event.timezone).slice(0, 10);
  const next = new Date(`${day}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(next);
}

export type CalendarStep = { id: string; title: string; responsible: string; notes: string; startsAt: Date; reminderMinutes: number };

export function dayCalendar(steps: CalendarStep[]): string {
  const escape = (text: string) => text.replaceAll("\\", "\\\\").replace(/\r?\n/g, "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,");
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // RFC 5545: строки ограничиваются 75 октетами, кириллица занимает >1 байта.
  const fold = (line: string) => {
    const lines: string[] = []; let part = ""; let bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) { lines.push(part); part = " "; bytes = 1; }
      part += char; bytes += size;
    }
    lines.push(part); return lines.join("\r\n");
  };
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vmeste//Wedding day//RU", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const step of steps) lines.push(
    "BEGIN:VEVENT", `UID:${step.id}@vmeste`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(step.startsAt)}`, `DTEND:${stamp(new Date(step.startsAt.getTime() + 15 * 60000))}`,
    `SUMMARY:${escape(step.title)}`, `DESCRIPTION:${escape([step.responsible ? `Ответственный: ${step.responsible}` : "", step.notes].filter(Boolean).join("\n"))}`,
    "BEGIN:VALARM", `TRIGGER:-PT${step.reminderMinutes}M`, "ACTION:DISPLAY", `DESCRIPTION:${escape(step.title)}`, "END:VALARM", "END:VEVENT",
  );
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
