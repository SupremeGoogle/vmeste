/**
 * Сборка xlsx — без Excel и без больших библиотек.
 *
 * Пишет минимальный, но настоящий файл: общие строки, числа, скрытые
 * листы и объединённые ячейки, — ровно то, что встречается в живых
 * списках гостей и что должен понимать читатель файлов. Отсюда же
 * берётся выгрузка ответов: xlsx мы читаем своими руками поверх fflate
 * (server/import/read-file.ts) — пишем тем же способом, а не тянем
 * вторую библиотеку ради одной кнопки.
 */
import { zipSync, strToU8 } from "fflate";

export type SheetData = {
  name: string;
  rows: (string | number | null)[][];
  hidden?: boolean;
  merges?: string[];
  hiddenRows?: number[];
};

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const colName = (index: number) => {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

export function buildXlsx(sheets: SheetData[], extra: Record<string, string> = {}): Uint8Array {
  const shared: string[] = [];
  const sharedIndex = new Map<string, number>();
  const stringRef = (text: string) => {
    if (!sharedIndex.has(text)) {
      sharedIndex.set(text, shared.length);
      shared.push(text);
    }
    return sharedIndex.get(text)!;
  };

  const files: Record<string, Uint8Array> = {};
  sheets.forEach((sheet, s) => {
    const rows = sheet.rows
      .map((row, r) => {
        const hidden = sheet.hiddenRows?.includes(r + 1) ? ' hidden="1"' : "";
        const cells = row
          .map((value, c) => {
            if (value === null || value === "") return "";
            const ref = `${colName(c)}${r + 1}`;
            return typeof value === "number"
              ? `<c r="${ref}"><v>${value}</v></c>`
              : `<c r="${ref}" t="s"><v>${stringRef(value)}</v></c>`;
          })
          .join("");
        return `<row r="${r + 1}"${hidden}>${cells}</row>`;
      })
      .join("");
    const merges = sheet.merges?.length
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
      : "";
    files[`xl/worksheets/sheet${s + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData>${merges}</worksheet>`,
    );
  });

  files["xl/sharedStrings.xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared.map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`).join("")}</sst>`,
  );
  files["xl/workbook.xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((sheet, s) => `<sheet name="${esc(sheet.name)}" sheetId="${s + 1}"${sheet.hidden ? ' state="hidden"' : ""} r:id="rId${s + 1}"/>`)
      .join("")}</sheets></workbook>`,
  );
  files["xl/_rels/workbook.xml.rels"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, s) => `<Relationship Id="rId${s + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s + 1}.xml"/>`)
      .join("")}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
  );
  files["_rels/.rels"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  files["[Content_Types].xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
      .map((_, s) => `<Override PartName="/xl/worksheets/sheet${s + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join("")}<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`,
  );
  for (const [name, content] of Object.entries(extra)) files[name] = strToU8(content);

  return zipSync(files, { level: 6 });
}

export const toBuffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

/**
 * Заголовки ответа с файлом: имя с датой, чтобы у координатора на диске
 * не оказалось трёх одинаковых выгрузок разной свежести. Русское имя
 * уходит в `filename*` (RFC 5987), ASCII-запасной вариант — для старых
 * браузеров, которые его не понимают.
 */
export function xlsxHeaders(asciiName: string, humanName = asciiName): Record<string, string> {
  const stamp = new Date().toISOString().slice(0, 10);
  const encoded = encodeURIComponent(`${humanName}-${stamp}.xlsx`);
  return {
    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition": `attachment; filename="${asciiName}-${stamp}.xlsx"; filename*=UTF-8''${encoded}`,
    "cache-control": "no-store",
  };
}
