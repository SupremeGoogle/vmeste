import { z } from "zod";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { InviteTheme } from "@/lib/invite-theme";
import { formatEventDate } from "@/lib/format-datetime";

export const photoAdjustmentSchema = z.object({
  x: z.number().min(0).max(100).default(50),
  y: z.number().min(0).max(100).default(50),
  zoom: z.number().min(1).max(2).default(1),
  brightness: z.number().min(50).max(150).default(100),
  darkness: z.number().min(0).max(60).default(0),
  original: z.boolean().default(true),
  fit: z.enum(["cover", "contain"]).default("cover"),
});
export type PhotoAdjustment = z.infer<typeof photoAdjustmentSchema>;
export const photoSettingsSchema = z.record(z.string().regex(/^(imageUrl|(?:items|photos)\.[0-3]\.imageUrl)$/), photoAdjustmentSchema).optional();
export const defaultPhotoAdjustment = (): PhotoAdjustment => photoAdjustmentSchema.parse({});
const short = z.string().trim().max(120);
export const weddingSchema = z.object({
  names: short.min(1), city: short, venueName: short,
  venueAddress: z.string().trim().max(500),
  mapUrl: z.union([z.literal(""), z.url().refine((v) => /^https?:\/\//i.test(v))]),
  deadline: z.union([z.literal(""), z.iso.datetime()]).default(""),
  childhood: z.boolean().default(true),
  portraitShape: z.enum(["signature", "rectangle"]).default("signature"),
  textPosition: z.enum(["bottom", "top"]).default("bottom"),
  captionLeft: short.default("Наша история"), captionRight: short.default("Вместе навсегда"),
});
export type WeddingProfile = z.infer<typeof weddingSchema>;

export function initials(names: string) {
  return names.split(/\s+(?:и|&|and)\s+/i).map((name) => Array.from(name.trim())[0] ?? "").filter(Boolean).join(" · ");
}

/** Work on copies: previews must never mutate stored blocks. */
export function personalizeBlocks(blocks: InviteBlockView[], theme: InviteTheme, date?: Date, timezone = "UTC"): InviteBlockView[] {
  const wedding = theme.wedding;
  if (!wedding) return blocks;
  return blocks.filter((block) => wedding.childhood || !(block.type === "PHOTOS" && /ребятиш|детств/i.test(String((block.content as {title?:string}).title)))).map((block) => {
    const c = { ...block.content } as Record<string, unknown>;
    if (date && typeof c.tag === "string" && /^\d{2}\s*[·./]\s*\d{2}\s*[·./]\s*\d{2,4}$/.test(c.tag)) c.tag = formatEventDate(date, timezone);
    if (block.type === "COVER") {
      c.names = wedding.names;
      c.dateText = [date ? formatEventDate(date, timezone) : c.dateText, wedding.city].filter(Boolean).join(" · ");
      if (!wedding.childhood) c.photos = [];
      if (theme.template === "serdce") c.footer = `С любовью, ${wedding.names}`;
    }
    if (block.type === "VENUE") Object.assign(c, { name: wedding.venueName, address: wedding.venueAddress, mapUrl: wedding.mapUrl });
    if (block.type === "MAP") Object.assign(c, { yandexUrl: wedding.mapUrl, googleUrl: "" });
    if (block.type === "RSVP_FORM" && wedding.deadline && !["bohema", "kraski", "serdce", "antic", "floral-garden", "odnazhdy", "little-happiness", "priznanie"].includes(theme.template)) c.title = `Пожалуйста, ответьте до ${formatEventDate(new Date(wedding.deadline), timezone)}`;
    if (block.type === "RSVP_FORM" && !wedding.deadline && /\d{1,2}\s+[а-я]+\s+20\d{2}/i.test(String(c.title))) c.title = "Подтвердите присутствие";
    if (block.type === "TEXT" && /^С любовью, .+\.$/.test(String(c.text))) c.text = `С любовью, ${wedding.names}.`;
    if (theme.template === "serdce" && block.type === "TEXT" && c.title === "До встречи!") c.text = `С любовью, ${wedding.names}`;
    if (theme.template === "roseraie" && block.type === "TEXT" && c.title === "Себастьян и София") c.title = wedding.names;
    // Подпись в заголовке прощания («С любовью, Элеонора и Джеймс») —
    // те же имена из образца, только в другом поле.
    if (block.type === "TEXT" && /^С любовью,\s+\S.*[^.!]$/.test(String(c.title))) c.title = `С любовью, ${wedding.names}`;
    // Срок ответа живёт в данных свадьбы («Имена, дата и место»); дата, вписанная в текст анкеты
    // ещё в образце («ответьте до 15 октября»), спорила бы с заголовком.
    if (block.type === "RSVP_FORM" && wedding.deadline && typeof c.text === "string") {
      c.text = c.text.replace(/до\s+(?:\d{1,2}\s+[а-яё]+(?:\s+20\d{2})?|\d{1,2}\.\d{1,2}\.\d{2,4}(?:\s*г(?=\.))?)/i, `до ${formatEventDate(new Date(wedding.deadline), timezone)}`);
    }
    return { ...block, content: c as InviteBlockView["content"] };
  });
}

export function invitationWarnings(blocks: InviteBlockView[], theme: InviteTheme): string[] {
  const visible = blocks.filter((block) => block.visible);
  const warnings: string[] = [];
  if (!theme.wedding) warnings.push("Укажите имена, дату и место торжества — кнопка «Имена, дата и место».");
  if (visible.some((b) => /\/media\/invite-[^\"\s]+\.(?:webp|jpg|png)/.test(JSON.stringify(b.content)))) warnings.push("В приглашении остались фотографии-примеры. Замените их своими или уберите.");
  const venue = visible.find((b) => b.type === "VENUE")?.content as { address?: string } | undefined;
  if (venue && !(theme.wedding?.venueAddress ?? venue.address)?.trim()) warnings.push("Укажите адрес площадки.");
  if (visible.some((b) => b.type === "RSVP_FORM") && !theme.wedding?.deadline) warnings.push("Срок ответа не указан — гости смогут ответить без ограничения по дате.");
  if (visible.some((b) => /Имя и Имя|Название площадки|Город, улица, дом/.test(JSON.stringify(b.content)))) warnings.push("Проверьте незаполненные имена, название площадки и адрес.");
  return warnings;
}

export function toLocalInput(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function fromLocalInput(value: string, timezone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const guess = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(guess)) return null;
  let result = new Date(guess);
  for (let i = 0; i < 3; i++) result = new Date(result.getTime() + guess - Date.parse(`${toLocalInput(result, timezone)}:00Z`));
  return toLocalInput(result, timezone) === value ? result : null;
}
