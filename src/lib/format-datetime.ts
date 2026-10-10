/**
 * Дата и время мероприятия (PLAN.md §4.12).
 *
 * Хранится UTC, показывается в часовом поясе площадки. Разница не
 * теоретическая: организатор из Москвы ведёт свадьбу в Иркутске, гость
 * открывает приглашение в Берлине — «в 16:00» должно означать местное время
 * площадки для всех троих. Поэтому пояс берётся из `Event.timezone`,
 * а не из браузера, и форматирование всегда идёт через Intl с `timeZone`.
 */
import type { Lang } from "@/lib/i18n";

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parts(date: Date, timezone: string, lang: Lang = "ru") {
  const formatter = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "ru-RU", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // Часы 0–23 при любом языке: en-US иначе даёт 12-часовые «01» без PM.
    hourCycle: "h23",
    weekday: "long",
  });
  const map = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    day: Number(map.get("day")),
    month: Number(map.get("month")),
    year: map.get("year") ?? "",
    hour: map.get("hour") ?? "",
    minute: map.get("minute") ?? "",
    weekday: map.get("weekday") ?? "",
  };
}

/** «12 сентября 2026» / «September 12, 2026» — Intl по-русски даёт «12 сент. 2026 г.», а это заголовок. */
export function formatEventDate(date: Date, timezone: string, lang: Lang = "ru"): string {
  const p = parts(date, timezone, lang);
  return lang === "en" ? `${MONTHS_EN[p.month - 1]} ${p.day}, ${p.year}` : `${p.day} ${MONTHS_GENITIVE[p.month - 1]} ${p.year}`;
}

/**
 * «суббота, 12 сентября 2026, 16:00» / «Saturday, September 12, 2026, 4:00 PM» —
 * для строки под заголовком. По-английски время 12-часовое с AM/PM, как
 * привычно читателю; раньше от него оставались только часы, и 13:00
 * превращалось в «01:00».
 */
export function formatEventDateTime(date: Date, timezone: string, lang: Lang = "ru"): string {
  const p = parts(date, timezone, lang);
  const time = lang === "en"
    ? new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(date)
    : `${p.hour}:${p.minute}`;
  return `${p.weekday}, ${formatEventDate(date, timezone, lang)}, ${time}`;
}

/** «до 1 сентября» / «by September 1» — срок ответа. */
export function formatDeadline(date: Date, timezone: string, lang: Lang = "ru"): string {
  const p = parts(date, timezone, lang);
  if (lang === "en") return `by ${MONTHS_EN[p.month - 1]} ${p.day}`;
  return `${p.day} ${MONTHS_GENITIVE[p.month - 1]}`;
}
