/**
 * Дата и время мероприятия (PLAN.md §4.12).
 *
 * Хранится UTC, показывается в часовом поясе площадки. Разница не
 * теоретическая: организатор из Москвы ведёт свадьбу в Иркутске, гость
 * открывает приглашение в Берлине — «в 16:00» должно означать местное время
 * площадки для всех троих. Поэтому пояс берётся из `Event.timezone`,
 * а не из браузера, и форматирование всегда идёт через Intl с `timeZone`.
 */
const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function parts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

/** «12 сентября 2026» — Intl по-русски даёт «12 сент. 2026 г.», а это заголовок. */
export function formatEventDate(date: Date, timezone: string): string {
  const p = parts(date, timezone);
  return `${p.day} ${MONTHS_GENITIVE[p.month - 1]} ${p.year}`;
}

/** «суббота, 12 сентября 2026, 16:00» — для строки под заголовком. */
export function formatEventDateTime(date: Date, timezone: string): string {
  const p = parts(date, timezone);
  return `${p.weekday}, ${formatEventDate(date, timezone)}, ${p.hour}:${p.minute}`;
}

/** «до 1 сентября» — срок ответа. */
export function formatDeadline(date: Date, timezone: string): string {
  const p = parts(date, timezone);
  return `${p.day} ${MONTHS_GENITIVE[p.month - 1]}`;
}
