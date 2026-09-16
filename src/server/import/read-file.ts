/**
 * Чтение файла со списком гостей в простую сетку строк.
 *
 * xlsx читаем сами поверх fflate, а не большой библиотекой: из всего
 * формата нам нужны тексты ячеек, объединения и признак скрытого листа.
 * Главное же — распаковку контролируем мы. Прежде чем что-то разжимать,
 * смотрим оглавление архива: сколько частей, сколько они весят после
 * распаковки и во сколько раз сжаты. Архив-бомба отклоняется до того,
 * как заберёт память процесса.
 *
 * Старый .xls и зашифрованный xlsx выглядят одинаково — это составной
 * документ Microsoft (сигнатура D0 CF 11 E0). Различаем по потоку
 * «EncryptedPackage» внутри и в обоих случаях объясняем, что сделать.
 */
import { unzipSync } from "fflate";
import Papa from "papaparse";
import { IMPORT_LIMITS as L, ImportError, formatBytes } from "./limits";

export type Sheet = {
  name: string;
  hidden: boolean;
  /** Строки как в файле: индекс — номер строки минус один, пустые строки сохраняются. */
  rows: string[][];
};

export type Workbook = {
  format: "xlsx" | "csv";
  sheets: Sheet[];
  /** Для CSV: как угадали кодировку. */
  encoding?: string;
};

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, i) => bytes[i] === byte);

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const CFB = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function containsUtf16(bytes: Uint8Array, text: string): boolean {
  const pattern = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) pattern[i * 2] = text.charCodeAt(i);
  outer: for (let i = 0; i <= bytes.length - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) if (bytes[i + j] !== pattern[j]) continue outer;
    return true;
  }
  return false;
}

export function readWorkbook(buffer: ArrayBuffer, fileName = ""): Workbook {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) throw new ImportError("empty", "Файл пустой.");
  if (bytes.length > L.fileBytes) {
    throw new ImportError(
      "too-big",
      `Файл весит ${formatBytes(bytes.length)}, а можно до ${formatBytes(L.fileBytes)}. Список гостей столько не занимает — возможно, в файле картинки: сохраните только таблицу.`,
    );
  }

  if (startsWith(bytes, CFB)) {
    if (containsUtf16(bytes, "EncryptedPackage")) {
      throw new ImportError("encrypted", "Файл защищён паролем. Снимите защиту в Excel («Файл → Сведения → Защита книги») и загрузите снова.");
    }
    throw new ImportError("xls", "Это старый формат Excel (.xls). Откройте файл в Excel и сохраните как «Книга Excel (.xlsx)» — или как CSV.");
  }

  if (startsWith(bytes, ZIP)) return readXlsx(bytes);

  // Не архив — пробуем как текст. Двоичный мусор (картинка, pdf) выдаёт себя нулевыми байтами.
  const head = bytes.subarray(0, 4096);
  if (head.includes(0) || /\.(pdf|docx?|pptx?|png|jpe?g|numbers|ods)$/i.test(fileName)) {
    throw new ImportError("format", "Это не таблица. Подойдёт файл Excel (.xlsx) или CSV.");
  }
  return readCsv(bytes);
}

// ─── CSV ────────────────────────────────────────────────────────

/** Кириллица в UTF-8 — двухбайтовые последовательности; если декодирование
 *  в UTF-8 даёт «замену» (U+FFFD), файл почти наверняка в 1251. */
export function decodeText(bytes: Uint8Array): { text: string; encoding: "utf-8" | "windows-1251" } {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("\uFFFD")) return { text: utf8.replace(/^\uFEFF/, ""), encoding: "utf-8" };
  return { text: new TextDecoder("windows-1251").decode(bytes).replace(/^\uFEFF/, ""), encoding: "windows-1251" };
}

/**
 * Разделитель — тот, что встречается в строках одинаково часто.
 * Угадывание papaparse на файле из трёх строк выбирало запятую, и
 * «Имя;Телефон» становилось одним столбцом. В русском Excel это «;»,
 * поэтому при равенстве он и побеждает.
 */
export function guessDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 30);
  let best = ";";
  let bestScore = 0;
  for (const delimiter of [";", "\t", ",", "|"]) {
    const counts = lines.map((line) => line.replace(/"[^"]*"/g, "").split(delimiter).length - 1);
    const withIt = counts.filter((n) => n > 0);
    if (withIt.length === 0) continue;
    // Доля строк с разделителем важнее числа вхождений: запятая
    // встречается и внутри «Иванов, Пётр».
    const mode = withIt.sort((a, b) => withIt.filter((n) => n === b).length - withIt.filter((n) => n === a).length)[0];
    const score = withIt.length / lines.length + counts.filter((n) => n === mode).length / lines.length;
    if (score > bestScore + 0.001) {
      best = delimiter;
      bestScore = score;
    }
  }
  return best;
}

function readCsv(bytes: Uint8Array): Workbook {
  const { text, encoding } = decodeText(bytes);
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    delimiter: guessDelimiter(text),
    preview: L.rowsPerSheet * 2,
  });
  const rows = parsed.data.map((row) => row.map((cell) => clean(cell)));
  return { format: "csv", encoding, sheets: [guardSheet({ name: "CSV", hidden: false, rows })] };
}

// ─── XLSX ───────────────────────────────────────────────────────

function readXlsx(bytes: Uint8Array): Workbook {
  let entries = 0;
  let total = 0;
  let macros = false;

  let parts: Record<string, Uint8Array>;
  try {
    parts = unzipSync(bytes, {
      filter(file) {
        entries++;
        if (entries > L.zipEntries) throw new ImportError("bomb", "Файл устроен подозрительно: слишком много частей внутри.");
        if (/vbaProject\.bin$/i.test(file.name)) macros = true;
        const wanted =
          file.name === "xl/workbook.xml" ||
          file.name === "xl/_rels/workbook.xml.rels" ||
          file.name === "xl/sharedStrings.xml" ||
          /^xl\/worksheets\/[^/]+\.xml$/.test(file.name);
        if (!wanted) return false;
        total += file.originalSize;
        const ratio = file.size > 0 ? file.originalSize / file.size : 0;
        if (total > L.unzippedBytes || (file.originalSize > 1024 * 1024 && ratio > L.compressionRatio)) {
          throw new ImportError("bomb", "Внутри файла слишком много данных для списка гостей. Сохраните в новый файл только лист с гостями.");
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("broken", "Файл повреждён или это не Excel. Попробуйте пересохранить его.");
  }

  if (macros) {
    throw new ImportError("macro", "В файле есть макросы (.xlsm). Сохраните его как обычную «Книгу Excel (.xlsx)».");
  }

  const text = (name: string) => (parts[name] ? new TextDecoder().decode(parts[name]) : "");
  const workbookXml = text("xl/workbook.xml");
  if (!workbookXml) throw new ImportError("broken", "Не нашли в файле ни одного листа. Попробуйте пересохранить его в Excel.");

  const shared = parseSharedStrings(text("xl/sharedStrings.xml"));
  const rels = new Map<string, string>();
  for (const m of text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) rels.set(id, target.replace(/^\/?(xl\/)?/, "xl/"));
  }

  const sheets: Sheet[] = [];
  const sheetTags = [...workbookXml.matchAll(/<sheet\b[^>]*>/g)];
  if (sheetTags.length > L.sheets * 3) {
    throw new ImportError("too-many-sheets", `В файле ${sheetTags.length} листов. Оставьте листы со списком гостей — до ${L.sheets}.`);
  }

  let cells = 0;
  for (const tag of sheetTags) {
    const name = decodeXml(attr(tag[0], "name") ?? "Лист");
    const state = attr(tag[0], "state");
    const target = rels.get(attr(tag[0], "r:id") ?? "");
    const xml = target ? text(target) : "";
    if (!xml) continue;
    const sheet = parseSheet(xml, shared, name, state === "hidden" || state === "veryHidden");
    cells += sheet.rows.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    if (cells > L.cellsTotal) {
      throw new ImportError("too-many-rows", "В файле слишком много заполненных ячеек для списка гостей. Удалите лишние листы и столбцы.");
    }
    sheets.push(guardSheet(sheet));
  }

  const visible = sheets.filter((s) => !s.hidden);
  if (visible.length > L.sheets) {
    throw new ImportError("too-many-sheets", `В файле ${visible.length} листов. Оставьте листы со списком гостей — до ${L.sheets}.`);
  }
  return { format: "xlsx", sheets };
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\s${name.replace(":", "\\:")}="([^"]*)"`).exec(tag);
  return m?.[1];
}

export function decodeXml(value: string): string {
  return value
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Текст из <si>/<is>: все <t>, кроме фонетических подсказок <rPh>. */
function richText(xml: string): string {
  const body = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let out = "";
  for (const m of body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g)) out += m[1] ?? "";
  return decodeXml(out);
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>|<si\s*\/>/g)].map((m) => richText(m[1] ?? ""));
}

/** «BC12» → [11, 54]: строка и столбец с нуля. */
function cellRef(ref: string): [number, number] | null {
  const m = /^([A-Z]{1,3})(\d+)$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return [Number(m[2]) - 1, col - 1];
}

function parseSheet(xml: string, shared: string[], name: string, hidden: boolean): Sheet {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
    const rowAttrs = rowMatch[1] ?? rowMatch[3] ?? "";
    // Скрытые строки организатор обычно прячет как «уже не зовём».
    if (/\shidden="(1|true)"/.test(rowAttrs)) continue;
    const r = Number(attr(rowAttrs, "r") ?? rows.length + 1) - 1;
    if (r >= L.rowsPerSheet * 2) {
      throw new ImportError("too-many-rows", `На листе «${name}» больше ${L.rowsPerSheet} строк. Список гостей столько не занимает — удалите лишнее.`);
    }

    for (const cell of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = cellRef(attr(cell[1], "r") ?? "");
      if (!ref) continue;
      const [, col] = ref;
      if (col >= L.columns * 2) continue;
      const type = attr(cell[1], "t");
      const inner = cell[2] ?? "";
      const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];

      let value = "";
      if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr") value = richText(inner);
      else if (type === "b") value = raw === "1" ? "да" : "";
      else if (type === "e") value = "";
      else if (raw !== undefined) value = type === "str" ? decodeXml(raw) : numberText(raw);

      if (!value) continue;
      (rows[r] ??= [])[col] = clean(value);
    }
  }

  // Объединённые ячейки: значение левой верхней переносим на всю область —
  // фамилия семьи, растянутая на три строки, относится ко всем трём.
  for (const m of xml.matchAll(/<mergeCell\s+ref="([A-Z]+\d+):([A-Z]+\d+)"/g)) {
    const from = cellRef(m[1]);
    const to = cellRef(m[2]);
    if (!from || !to) continue;
    const value = rows[from[0]]?.[from[1]];
    if (!value) continue;
    const height = Math.min(to[0] - from[0], 50);
    const width = Math.min(to[1] - from[1], 10);
    for (let r = from[0]; r <= from[0] + height; r++) {
      for (let c = from[1]; c <= from[1] + width; c++) {
        // По горизонтали объединяют заголовки — туда не дублируем, иначе
        // «Родня невесты» размножится по всем столбцам.
        if (c !== from[1]) continue;
        (rows[r] ??= [])[c] ??= value;
      }
    }
  }

  // Array.from, а не map: у разреженного массива map пропускает дыры,
  // и пустая строка листа превращалась в undefined.
  return { name, hidden, rows: Array.from(rows, (row) => Array.from(row ?? [], (v) => v ?? "")) };
}

/** Числа Excel хранит как 9.15E+11 — телефон должен остаться цифрами. */
function numberText(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (Number.isInteger(n)) return BigInt(Math.round(n)).toString();
  return String(Math.round(n * 1e6) / 1e6);
}

function clean(value: string): string {
  const text = String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  return text.length > L.cellChars ? text.slice(0, L.cellChars) : text;
}

/** Обрезаем пустые хвосты и проверяем пределы листа. */
function guardSheet(sheet: Sheet): Sheet {
  let rows = Array.from(sheet.rows, (row = []) => {
    let end = row.length;
    while (end > 0 && !row[end - 1]) end--;
    return row.slice(0, Math.min(end, L.columns));
  });
  let last = rows.length;
  while (last > 0 && rows[last - 1].length === 0) last--;
  rows = rows.slice(0, last);
  const filled = rows.filter((row) => row.some(Boolean)).length;
  if (filled > L.rowsPerSheet) {
    throw new ImportError("too-many-rows", `На листе «${sheet.name}» ${filled} заполненных строк, а можно до ${L.rowsPerSheet}.`);
  }
  return { ...sheet, rows };
}
