/**
 * Выгрузка ответов в CSV.
 *
 * Файл открывают в Excel, и это диктует всё (PLAN.md §5.9, зеркало импорта):
 *   — разделитель «;»: в русской локали Excel запятая — дробная часть,
 *     и файл с запятыми ляжет в одну колонку;
 *   — BOM в начале, иначе кириллица превратится в «ÐÐ½Ð½Ð°»;
 *   — CRLF в конце строк;
 *   — значение, начинающееся с `=`, `+`, `-`, `@`, экранируется апострофом:
 *     Excel считает такое формулой (CSV injection), а имена и заметки
 *     пишут живые люди.
 */
const DELIMITER = ";";
const BOM = "﻿";

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /["\n\r;]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(DELIMITER));
  return BOM + lines.join("\r\n") + "\r\n";
}

/** Заголовок ответа: имя файла с датой, чтобы у координатора на диске не
 *  оказалось трёх одинаковых `guests.csv` разной свежести. */
export function csvHeaders(filename: string): Record<string, string> {
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}-${stamp}.csv"`,
    "cache-control": "no-store",
  };
}
