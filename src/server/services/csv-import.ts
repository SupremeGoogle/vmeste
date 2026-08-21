/**
 * Разбор CSV со списком гостей.
 *
 * Файл почти всегда приходит из Excel, а значит (PLAN.md §5.9):
 *   — кодировка Windows-1251, а не UTF-8;
 *   — разделитель «;», потому что в русской локали запятая это дробная часть;
 *   — BOM в начале файла;
 *   — телефон, превращённый в «9.15E+11».
 *
 * Поэтому кодировка и разделитель определяются, а не предполагаются,
 * и импорт всегда показывает предпросмотр до записи в базу.
 */
import Papa from "papaparse";

export type ParsedRow = {
  displayName: string;
  phone?: string;
  email?: string;
  note?: string;
  plusOneAllowed?: boolean;
};

export type ParseResult = {
  encoding: "utf-8" | "windows-1251";
  delimiter: string;
  headers: string[];
  rows: ParsedRow[];
  skipped: number;
  warnings: string[];
};

/** Кириллица в UTF-8 — двухбайтовые последовательности; если декодирование
 *  в UTF-8 даёт «замену» (U+FFFD), файл почти наверняка в 1251. */
function decode(buffer: ArrayBuffer): { text: string; encoding: ParseResult["encoding"] } {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!utf8.includes("�")) return { text: utf8.replace(/^﻿/, ""), encoding: "utf-8" };

  const cp1251 = new TextDecoder("windows-1251").decode(buffer);
  return { text: cp1251.replace(/^﻿/, ""), encoding: "windows-1251" };
}

const NAME_KEYS = ["имя", "фио", "гость", "name", "guest", "фамилия"];
const PHONE_KEYS = ["телефон", "тел", "phone", "моб"];
const EMAIL_KEYS = ["почта", "email", "e-mail", "мейл"];
const NOTE_KEYS = ["заметка", "коммент", "note", "comment"];
/** Колонка «+1»: в списках её пишут как угодно, лишь бы человек понял. */
const PLUS_ONE_KEYS = ["+1", "плюс", "спутник", "пара", "plus", "partner"];

/** «да», «+», «1», «true» — всё это согласие. Пустое — нет. */
function isYes(raw?: string): boolean {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return ["да", "yes", "true", "1", "+", "v", "х", "x", "да+1"].includes(value);
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const [header, value] of Object.entries(row)) {
    const h = header.trim().toLowerCase();
    if (keys.some((k) => h.includes(k)) && value?.trim()) return value.trim();
  }
  return undefined;
}

/** Excel превращает длинные числа в «9.15E+11» — восстанавливаем. */
function fixPhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const sci = /^(\d)(?:\.(\d+))?[eE]\+?(\d+)$/.exec(raw.trim());
  if (sci) {
    const digits = (sci[1] + (sci[2] ?? "")).padEnd(Number(sci[3]) + 1, "0");
    return `+${digits}`;
  }
  return raw.trim();
}

export function parseGuestCsv(buffer: ArrayBuffer): ParseResult {
  const { text, encoding } = decode(buffer);
  const warnings: string[] = [];

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    // Papa определяет разделитель сам, но подсказываем русские варианты.
    delimitersToGuess: [";", ",", "\t", "|"],
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    warnings.push(`Разбор с замечаниями: ${parsed.errors[0].message}`);
  }

  const headers = parsed.meta.fields ?? [];
  const hasNameColumn = headers.some((h) =>
    NAME_KEYS.some((k) => h.trim().toLowerCase().includes(k)),
  );

  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (const raw of parsed.data) {
    // Если колонки «имя» нет — берём первую непустую: организаторы часто
    // присылают файл вообще без заголовков.
    const displayName = hasNameColumn
      ? pick(raw, NAME_KEYS)
      : Object.values(raw).find((v) => v?.trim());

    if (!displayName || displayName.length < 2) {
      skipped++;
      continue;
    }

    rows.push({
      displayName: displayName.replace(/\s+/g, " ").trim(),
      phone: fixPhone(pick(raw, PHONE_KEYS)),
      email: pick(raw, EMAIL_KEYS),
      note: pick(raw, NOTE_KEYS),
      plusOneAllowed: isYes(pick(raw, PLUS_ONE_KEYS)),
    });
  }

  if (!hasNameColumn) {
    warnings.push("Колонка с именем не найдена — взят первый столбец. Проверьте предпросмотр.");
  }

  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = row.displayName.toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1);
  if (dupes.length > 0) {
    warnings.push(
      `Полные тёзки в файле (${dupes.length}): ${dupes.slice(0, 3).map(([n]) => n).join(", ")}. ` +
        `Им стоит дописать отчество или заметку — иначе на входе они не различат себя.`,
    );
  }

  return {
    encoding,
    delimiter: parsed.meta.delimiter,
    headers,
    rows,
    skipped,
    warnings,
  };
}
