/**
 * Устройство таблицы: где шапка, какой столбец что значит, где разделы.
 *
 * Здесь две вещи. Угадывание правилами — запасной путь, когда умный
 * разбор выключен или DeepSeek не ответил. И применение схемы ко всем
 * строкам — его делает только код: ИИ описывает таблицу, но не
 * переписывает гостей, поэтому 800 строк разбираются за миллисекунды
 * и ни одна не может быть «додумана».
 */
import type { Sheet } from "./read-file";

export const COLUMN_ROLES = [
  "name", "last_name", "first_name", "middle_name", "phone", "email", "plus_one",
  "companion", "party_size", "side", "group", "table", "note", "rsvp", "ignore",
] as const;
export type ColumnRole = (typeof COLUMN_ROLES)[number];

export const ROLE_LABEL: Record<ColumnRole, string> = {
  name: "Имя (целиком)",
  last_name: "Фамилия",
  first_name: "Имя",
  middle_name: "Отчество",
  phone: "Телефон",
  email: "Почта",
  plus_one: "Может с парой (+1)",
  companion: "Имя спутника",
  party_size: "Сколько человек",
  side: "Сторона (жених/невеста)",
  group: "Группа",
  table: "Стол",
  note: "Заметка",
  rsvp: "Придёт ли",
  ignore: "Не брать",
};

export const ROLE_LABEL_EN: Record<ColumnRole, string> = {
  name: "Full name",
  last_name: "Last name",
  first_name: "First name",
  middle_name: "Middle name",
  phone: "Phone",
  email: "Email",
  plus_one: "Can bring a +1",
  companion: "+1’s name",
  party_size: "Party size",
  side: "Side (bride/groom)",
  group: "Group",
  table: "Table",
  note: "Note",
  rsvp: "RSVP",
  ignore: "Skip",
};

export const SECTION_MEANINGS = ["side", "group", "table"] as const;
export type SectionMeaning = (typeof SECTION_MEANINGS)[number];

export type ColumnPlan = { index: number; header: string; role: ColumnRole; confidence: number };

export type StructurePlan = {
  sheetIndex: number;
  /** Строка шапки, с нуля; null — шапки нет. */
  headerRow: number | null;
  firstDataRow: number;
  columns: ColumnPlan[];
  /** Что означают строки-разделы («Родня невесты», «Стол 3»). */
  sectionMeaning: SectionMeaning | null;
  /** Итоги, повторы шапки и прочие не-гости, с нуля. */
  serviceRows: number[];
  /** Фраза для организатора, если что-то неоднозначно. */
  note: string;
  source: "ai" | "rules";
};

/** Строка таблицы, приведённая к полям, — ещё не гости: в имени может быть семья. */
export type RowCandidate = {
  row: number;
  nameText: string;
  phone: string | null;
  extraPhones: string[];
  email: string | null;
  plusOne: boolean;
  companion: string | null;
  partySize: number | null;
  side: string | null;
  group: string | null;
  table: string | null;
  note: string | null;
  rsvp: string | null;
};

const HEADER_WORDS: [ColumnRole, RegExp][] = [
  ["phone", /тел|phone|моб|сот|номер|whatsapp|ватсап|telegram|контакт|связь|contact/i],
  ["email", /почт|mail|e-mail|емейл|имейл/i],
  ["companion", /спутник|партн[её]р|с кем|пара\s*\(имя|имя\s*пары|companion|partner/i],
  ["plus_one", /\+\s*1|плюс|с парой|пара|plus/i],
  ["party_size", /кол-?во|количеств|челов|сколько|персон|мест\b|guests?\s*count/i],
  ["last_name", /^фамил|surname|last\s*name/i],
  ["middle_name", /отчеств|middle/i],
  ["first_name", /^имя$|first\s*name/i],
  ["name", /фио|ф\.и\.о|гост|имя|name|кто|приглаш|список/i],
  ["side", /сторон|чей|чьи|от кого|side/i],
  ["group", /групп|катег|родств|кем приход|кто это|отношен|круг|group/i],
  ["table", /стол|table/i],
  ["rsvp", /придет|придёт|подтвер|ответ|статус|будет|rsvp/i],
  ["note", /замет|коммент|примеч|инфо|note|comment|пожелан|аллерг/i],
];

const PHONE_RE = /^(?:\+?[78]|\+\d{1,3})?[\s\-(]*\d{3}[\s\-)]*\d{3}[\s-]*\d{2}[\s-]*\d{2}$|^\+?\d{10,13}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zа-я]{2,}$/i;
const YES_NO_RE = /^(да|нет|yes|no|\+|-|–|1|0|v|✓|✔|x|х|true|false)$/i;
// \b в JS не видит границу кириллического слова — конец задан явно.
const SERVICE_RE = /^(итого|всего|total|сумма|количество гостей|кол-во гостей)(?=$|[\s:.,;!-])/i;
/** Порядковый номер: «№», «п/п» — не данные о госте. */
const NUMBER_HEADER_RE = /^(№|#|n|no\.?|п\/п|№\s*п\/п|нпп|порядк\S*)$/i;
/** Одиночная шапка над столбцом имён: «Гости», «ФИО», «Список». */
const LONE_NAME_HEADER_RE = /^(гост[ьи]|фио|ф\.и\.о\.?|имя|имена|список(\s+гостей)?|приглашенные|приглашённые|кто|name|names|guests?)$/i;
const NAME_RE = /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё.'’`\-\s,&+()]*$/;
const SECTION_HINT = /сторон|родн|родствен|друз|коллег|работ|сосед|однокласс|однокурс|семь[яи]\b|стол|гост[ие]\s+(жених|невест)|жених|невест|:$/i;

export const cell = (row: string[] | undefined, index: number) => (row?.[index] ?? "").trim();

export function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13 && PHONE_RE.test(value.replace(/\s+/g, " ").trim());
}

export const looksLikeEmail = (value: string) => EMAIL_RE.test(value.trim());

export function looksLikeName(value: string): boolean {
  const text = value.trim();
  if (text.length < 2 || text.length > 120 || !NAME_RE.test(text)) return false;
  return text.split(/\s+/).length <= 8;
}

export function isYes(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return /^(да|yes|true|1|\+|v|✓|✔|x|х|да\s*\+\s*1|\+\s*1|с парой|будет пара|пара)$/.test(value)
    || /^(2|двое|вдвоем|вдвоём)$/.test(value);
}

const filledRows = (sheet: Sheet) => sheet.rows.filter((row) => row.some(Boolean)).length;

/** Лист, где больше всего строк, похожих на людей. Скрытые — только если других нет. */
export function pickSheet(sheets: Sheet[]): number {
  let best = 0;
  let bestScore = -1;
  sheets.forEach((sheet, index) => {
    const people = sheet.rows.filter((row) => row.some((v) => looksLikeName(v))).length;
    const score = people * (sheet.hidden ? 0.1 : 1) + filledRows(sheet) * 0.01;
    if (score > bestScore) { bestScore = score; best = index; }
  });
  return best;
}

function roleByHeader(header: string): ColumnRole | null {
  const text = header.trim();
  if (!text || text.length > 60) return null;
  for (const [role, re] of HEADER_WORDS) if (re.test(text)) return role;
  return null;
}

/** Строка — это шапка, если в ней хотя бы две ячейки узнаются как названия столбцов
 *  или одна, а остальные — короткие подписи без цифр. */
function headerScore(row: string[]): number {
  const filled = row.filter(Boolean);
  if (filled.length === 0) return 0;
  if (filled.length === 1 && LONE_NAME_HEADER_RE.test(filled[0].trim())) return 1;
  const known = filled.filter((v) => roleByHeader(v)).length;
  const hasData = filled.some((v) => looksLikePhone(v) || looksLikeEmail(v));
  if (hasData) return 0;
  return known >= 2 ? known + 1 : known === 1 && filled.length >= 2 ? 1 : 0;
}

/** Угадываем устройство листа правилами. */
export function guessStructure(sheet: Sheet, sheetIndex: number): StructurePlan {
  const rows = sheet.rows;

  let headerRow: number | null = null;
  let bestScore = 0;
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const score = headerScore(rows[r] ?? []);
    if (score > bestScore) { bestScore = score; headerRow = r; }
  }
  const firstDataRow = headerRow === null ? 0 : headerRow + 1;
  const width = Math.max(0, ...rows.map((row) => row.length));
  const data = rows.slice(firstDataRow);

  const columns: ColumnPlan[] = [];
  for (let c = 0; c < width; c++) {
    const header = headerRow === null ? "" : cell(rows[headerRow], c);
    const values = data.map((row) => cell(row, c)).filter(Boolean);
    if (values.length === 0 && !header) continue;
    const share = (test: (v: string) => boolean) => (values.length ? values.filter(test).length / values.length : 0);

    let role: ColumnRole | null = NUMBER_HEADER_RE.test(header.trim()) ? "ignore" : roleByHeader(header);
    let confidence = role ? 0.8 : 0;
    // Столбец 1, 2, 3… — нумерация строк, как бы он ни назывался.
    const numbers = values.map(Number);
    const sequential = values.length >= 2 && numbers.every((n, i) => Number.isInteger(n) && (i === 0 || n === numbers[i - 1] + 1));
    // Содержимое перевешивает шапку, когда оно однозначно.
    if (sequential && role !== "phone") { role = "ignore"; confidence = 0.9; }
    else if (share(looksLikePhone) > 0.6) { role = "phone"; confidence = 0.95; }
    else if (share(looksLikeEmail) > 0.6) { role = "email"; confidence = 0.95; }
    else if (!role) {
      if (values.length && share((v) => YES_NO_RE.test(v)) > 0.8) { role = "plus_one"; confidence = 0.5; }
      else if (values.length && share((v) => /^\d{1,2}$/.test(v)) > 0.8) { role = "party_size"; confidence = 0.4; }
      else if (share(looksLikeName) > 0.6) { role = "name"; confidence = 0.5; }
      else { role = "note"; confidence = 0.3; }
    }
    columns.push({ index: c, header, role, confidence });
  }

  // Имя целиком может быть только одно; остальные «имена» — скорее спутники или заметки.
  const names = columns.filter((col) => col.role === "name");
  const parts = columns.some((col) => col.role === "last_name" || col.role === "first_name");
  if (parts) names.forEach((col) => { col.role = "note"; });
  else names.slice(1).forEach((col) => { col.role = col.header ? "note" : "companion"; });
  if (!parts && names.length === 0) {
    const first = columns.find((col) => col.role === "note");
    if (first) { first.role = "name"; first.confidence = 0.3; }
  }

  const nameCols = columns.filter((col) => ["name", "last_name", "first_name"].includes(col.role)).map((c) => c.index);
  const serviceRows: number[] = [];
  let sectionHits = 0;
  for (let r = firstDataRow; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const filled = row.filter(Boolean);
    if (filled.length === 0) continue;
    if (filled.some((v) => SERVICE_RE.test(v)) || filled.every((v) => /^\d+$/.test(v))) serviceRows.push(r);
    else if (headerRow !== null && row.join("|") === rows[headerRow].join("|")) serviceRows.push(r);
    else if (isSectionRow(row, nameCols)) sectionHits++;
  }

  return {
    sheetIndex,
    headerRow,
    firstDataRow,
    columns,
    sectionMeaning: sectionHits > 0 ? "group" : null,
    serviceRows,
    note: "",
    source: "rules",
  };
}

/** Раздел — строка с одной заполненной ячейкой, которая не похожа на гостя. */
export function isSectionRow(row: string[], nameCols: number[]): boolean {
  const filled = row.map((v, i) => [v, i] as const).filter(([v]) => v);
  if (filled.length !== 1) return false;
  const [value, index] = filled[0];
  if (SECTION_HINT.test(value)) return true;
  return !nameCols.includes(index) && !looksLikePhone(value);
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) return `+7${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+7${digits}`;
  return raw.trim().startsWith("+") ? `+${digits}` : raw.trim();
}

/** Телефонов в ячейке может быть два: «8 999 111-22-33, 8 916 …». */
export function splitPhones(raw: string): string[] {
  return raw
    .split(/[,;/]|\s{2,}|\sили\s/)
    .map((part) => part.trim())
    .filter((part) => part.replace(/\D/g, "").length >= 10)
    .map(normalizePhone);
}

/** Применяем схему ко всем строкам листа. */
export function applyStructure(sheet: Sheet, plan: StructurePlan): RowCandidate[] {
  const byRole = (role: ColumnRole) => plan.columns.filter((col) => col.role === role).map((col) => col.index);
  const nameCols = byRole("name");
  const partCols = { last: byRole("last_name"), first: byRole("first_name"), middle: byRole("middle_name") };
  const allNameCols = [...nameCols, ...partCols.last, ...partCols.first];
  const service = new Set(plan.serviceRows);
  const pick = (row: string[], cols: number[]) => cols.map((c) => cell(row, c)).filter(Boolean);

  const out: RowCandidate[] = [];
  let section: string | null = null;

  for (let r = plan.firstDataRow; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] ?? [];
    if (!row.some(Boolean) || service.has(r)) continue;
    if (plan.headerRow !== null && r !== plan.headerRow && row.join("|") === (sheet.rows[plan.headerRow] ?? []).join("|")) continue;

    if (plan.sectionMeaning && isSectionRow(row, allNameCols)) {
      section = row.find(Boolean)!.replace(/:$/, "").trim();
      continue;
    }

    const nameText = nameCols.length
      ? pick(row, nameCols).join(" ")
      : [pick(row, partCols.last)[0], pick(row, partCols.first)[0], pick(row, partCols.middle)[0]]
          .filter(Boolean)
          .join(" ");
    if (!nameText) continue;

    // «Контакт» часто один на всё: телефон или почта вперемешку.
    // Поэтому телефоны и почты ищем в обоих видах столбцов.
    const contacts = pick(row, [...byRole("phone"), ...byRole("email")]);
    const phones = contacts.flatMap(splitPhones);
    const emails = contacts.flatMap((value) => value.split(/[\s,;]+/)).filter(looksLikeEmail);
    const size = Number.parseInt(pick(row, byRole("party_size"))[0] ?? "", 10);
    const joined = (role: ColumnRole) => pick(row, byRole(role)).join("; ") || null;

    out.push({
      row: r,
      nameText,
      phone: phones[0] ?? null,
      extraPhones: phones.slice(1),
      email: emails[0] ?? null,
      plusOne: pick(row, byRole("plus_one")).some(isYes),
      companion: pick(row, byRole("companion")).find((v) => looksLikeName(v) && !isYes(v)) ?? null,
      partySize: Number.isFinite(size) && size > 0 && size < 50 ? size : null,
      side: joined("side") ?? (plan.sectionMeaning === "side" ? section : null),
      group: joined("group") ?? (plan.sectionMeaning === "group" ? section : null),
      table: joined("table") ?? (plan.sectionMeaning === "table" ? section : null),
      note: joined("note"),
      rsvp: joined("rsvp"),
    });
  }
  return out;
}
