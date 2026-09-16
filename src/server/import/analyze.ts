/**
 * Разбор загруженного файла в черновик импорта.
 *
 * Порядок: прочитать файл → понять устройство (ИИ или правила) →
 * применить ко всем строкам → поделить сложные ячейки на людей →
 * найти повторы в файле и среди уже добавленных гостей.
 *
 * Результат — черновик: ничего не записано, организатор всё видит и
 * правит в предпросмотре. Смена роли столбца или листа пересобирает
 * гостей из того же черновика без повторного запроса к ИИ: деления
 * ячеек кешированы по тексту.
 */
import { normalizeName } from "@/lib/name-normalize";
import { IMPORT_LIMITS as L, ImportError } from "./limits";
import { readWorkbook, type Sheet } from "./read-file";
import {
  applyStructure, guessStructure, pickSheet, type ColumnPlan, type RowCandidate, type StructurePlan,
} from "./structure";
import { isSimpleCell, splitByRules, type SplitResult } from "./people";
import { AiUnavailable, aiConfigured, newBudget } from "./deepseek";
import { aiSplitCells, aiStructure } from "./ai";

export type ImportStage = "read" | "structure" | "people" | "duplicates";

export type DraftGuest = {
  key: string;
  /** Номер строки в файле (с единицы) — показываем «строка 14». */
  sourceRow: number;
  sourceText: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  plusOneAllowed: boolean;
  plusOneName: string | null;
  /** Брать ли в импорт — по умолчанию нет для повторов и уже добавленных. */
  include: boolean;
  flags: {
    duplicateInFile: boolean;
    /** Имя уже есть среди гостей мероприятия. */
    existing: string | null;
    /** Почему стоит проверить. */
    review: string | null;
    /** Из одной ячейки получилось несколько человек. */
    fromGroup: boolean;
  };
};

export type ImportAnalysis = {
  fileName: string;
  format: "xlsx" | "csv";
  sheets: { name: string; hidden: boolean; rows: number }[];
  plan: StructurePlan;
  guests: DraftGuest[];
  skippedRows: number;
  warnings: string[];
  ai: { enabled: boolean; used: boolean; failure: string | null };
};

/** То, что хранится между предпросмотром и записью: разбор плюс исходник для пересборки. */
export type ImportWorkspace = ImportAnalysis & {
  workbookSheets: Sheet[];
  splits: Record<string, SplitResult>;
};

export async function analyzeImport({
  buffer, fileName, smart, existingNames, onStage,
}: {
  buffer: ArrayBuffer;
  fileName: string;
  smart: boolean;
  /** Ключи поиска гостей, которые уже есть в мероприятии → имя. */
  existingNames: Map<string, string>;
  onStage?: (stage: ImportStage) => void;
}): Promise<ImportWorkspace> {
  onStage?.("read");
  const workbook = readWorkbook(buffer, fileName);
  const usable = workbook.sheets.some((sheet) => sheet.rows.some((row) => row.some(Boolean)));
  if (!usable) throw new ImportError("empty", "В файле нет заполненных ячеек.");

  const aiEnabled = smart && aiConfigured();
  const budget = newBudget();
  let failure: string | null = smart && !aiConfigured() ? "умный разбор не настроен" : null;

  onStage?.("structure");
  const sheetIndex = pickSheet(workbook.sheets);
  const sheet = workbook.sheets[sheetIndex];
  let plan = guessStructure(sheet, sheetIndex);
  if (aiEnabled) {
    try {
      const aiPlan = await aiStructure(sheet, sheetIndex, budget);
      // ИИ не нашёл столбца с именем — его схеме не верим целиком.
      if (aiPlan.columns.some((col) => ["name", "last_name", "first_name"].includes(col.role))) plan = aiPlan;
      else failure = "не узнал столбец с именами";
    } catch (error) {
      failure = error instanceof AiUnavailable ? error.message : "ошибка разбора";
    }
  }

  onStage?.("people");
  const candidates = applyStructure(sheet, plan);
  const complex = [...new Set(candidates.map((c) => c.nameText).filter((text) => !isSimpleCell(text)))];
  const splits: Record<string, SplitResult> = {};
  if (aiEnabled && failure === null && complex.length > 0) {
    try {
      const found = await aiSplitCells(complex, budget);
      for (const [text, split] of found) splits[text] = split;
    } catch (error) {
      failure = error instanceof AiUnavailable ? `делил пары правилами: ${error.message}` : "делил пары правилами";
    }
  }

  onStage?.("duplicates");
  const built = buildGuests(sheet, plan, candidates, splits, existingNames);
  if (built.guests.length === 0) {
    throw new ImportError("no-guests", "Не нашли в файле ни одного гостя. Проверьте, что в таблице есть столбец с именами.");
  }
  if (built.guests.length > L.guests) {
    throw new ImportError("too-many-rows", `В файле ${built.guests.length} гостей, а за один раз можно до ${L.guests}. Разбейте список на части.`);
  }

  return {
    fileName: fileName.slice(0, 120),
    format: workbook.format,
    sheets: workbook.sheets.map((s) => ({ name: s.name, hidden: s.hidden, rows: s.rows.filter((r) => r.some(Boolean)).length })),
    plan,
    guests: built.guests,
    skippedRows: built.skippedRows,
    warnings: built.warnings,
    ai: { enabled: smart, used: plan.source === "ai" || Object.keys(splits).length > 0, failure },
    workbookSheets: workbook.sheets,
    splits,
  };
}

/** Пересборка после правки ролей столбцов или смены листа — без ИИ. */
export function rebuildImport(
  workspace: ImportWorkspace,
  change: { sheetIndex?: number; columns?: ColumnPlan[] },
  existingNames: Map<string, string>,
): ImportWorkspace {
  let plan = workspace.plan;
  if (change.sheetIndex !== undefined && change.sheetIndex !== plan.sheetIndex) {
    const sheet = workspace.workbookSheets[change.sheetIndex];
    if (!sheet) return workspace;
    plan = guessStructure(sheet, change.sheetIndex);
  }
  if (change.columns) {
    const known = new Map(plan.columns.map((col) => [col.index, col]));
    plan = {
      ...plan,
      columns: change.columns
        .filter((col) => known.has(col.index))
        .map((col) => ({ ...known.get(col.index)!, role: col.role, confidence: 1 })),
    };
  }
  const sheet = workspace.workbookSheets[plan.sheetIndex];
  const candidates = applyStructure(sheet, plan);
  const built = buildGuests(sheet, plan, candidates, workspace.splits, existingNames);
  return { ...workspace, plan, ...built };
}

function splitFor(text: string, splits: Record<string, SplitResult>): SplitResult {
  return splits[text] ?? splitByRules(text);
}

export function buildGuests(
  sheet: Sheet,
  plan: StructurePlan,
  candidates: RowCandidate[],
  splits: Record<string, SplitResult>,
  existingNames: Map<string, string>,
): { guests: DraftGuest[]; skippedRows: number; warnings: string[] } {
  const guests: DraftGuest[] = [];
  const warnings: string[] = [];
  let skippedRows = 0;

  for (const candidate of candidates) {
    const split = splitFor(candidate.nameText, splits);
    const people = split.people.filter((p) => /[A-Za-zА-Яа-яЁё]/.test(p));
    if (people.length === 0) {
      skippedRows++;
      continue;
    }

    const notes = (index: number): string | null => {
      const parts: string[] = [];
      if (candidate.side) parts.push(`Сторона: ${candidate.side}`);
      if (candidate.group) parts.push(candidate.group);
      if (candidate.table) parts.push(`Стол: ${candidate.table}`);
      if (people.length > 1) parts.push(`Вместе с: ${people.filter((_, i) => i !== index).join(", ")}`);
      const size = split.partySize ?? candidate.partySize;
      if (size && size > people.length) parts.push(`${size} чел.`);
      if (split.childrenMentioned) parts.push("с детьми");
      if (candidate.rsvp) parts.push(`В списке: ${candidate.rsvp}`);
      if (candidate.extraPhones.length && index === 0) parts.push(`Ещё телефон: ${candidate.extraPhones.join(", ")}`);
      if (candidate.note) parts.push(candidate.note);
      const text = parts.join(" · ");
      return text ? text.slice(0, 500) : null;
    };

    people.forEach((person, index) => {
      const displayName = person.replace(/\s+/g, " ").trim().slice(0, 120);
      const single = people.length === 1;
      const companion = single ? candidate.companion ?? split.companionName : null;
      const size = split.partySize ?? candidate.partySize;
      let review = split.doubt;
      if (!review && displayName.length < 3) review = "Слишком короткое имя";
      if (!review && /\d/.test(displayName)) review = "В имени есть цифры";
      if (!review && plan.source === "rules" && plan.columns.find((c) => c.role === "name")?.confidence === 0.3) {
        review = "Не уверены, что это столбец с именами";
      }

      guests.push({
        key: `${candidate.row}-${index}`,
        sourceRow: candidate.row + 1,
        sourceText: candidate.nameText.slice(0, 200),
        displayName,
        // Телефон и почта из строки — первому человеку: у пары номер обычно один.
        phone: index === 0 ? candidate.phone : null,
        email: index === 0 ? candidate.email : null,
        note: notes(index),
        plusOneAllowed:
          // Ровно двое — это пара. Семья на четверых — не «+1», это видно в заметке.
          single && (candidate.plusOne || split.companionAllowed || Boolean(companion) || (size === 2 && !split.childrenMentioned)),
        plusOneName: companion ? companion.slice(0, 120) : null,
        include: true,
        flags: { duplicateInFile: false, existing: null, review: review ?? null, fromGroup: !single },
      });
    });
  }

  const seen = new Set<string>();
  let duplicates = 0;
  let existing = 0;
  for (const guest of guests) {
    const key = normalizeName(guest.displayName);
    const already = existingNames.get(key);
    if (already) {
      guest.flags.existing = already;
      guest.include = false;
      existing++;
    }
    if (seen.has(key)) {
      guest.flags.duplicateInFile = true;
      guest.include = false;
      duplicates++;
    }
    seen.add(key);
  }

  if (existing > 0) warnings.push(`${existing} уже есть в списке гостей — по умолчанию не добавляем.`);
  if (duplicates > 0) warnings.push(`${duplicates} повторяются в файле — повторы сняты.`);
  const hiddenSkipped = sheet.hidden ? 1 : 0;
  if (hiddenSkipped) warnings.push("Выбран скрытый лист файла.");

  return { guests, skippedRows, warnings };
}
