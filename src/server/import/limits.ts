/**
 * Пределы импорта списка гостей.
 *
 * Самый большой настоящий список, который мы видели, — 400 человек на
 * двух листах. Пределы стоят с запасом в несколько раз, но так, чтобы
 * файл, собранный назло (архив-бомба, миллион пустых ячеек), отклонялся
 * до того, как съест память и время процесса, который обслуживает
 * и гостей на входе.
 */
import type { Lang } from "@/lib/i18n";

export const IMPORT_LIMITS = {
  /** Сам файл. Список гостей в Excel весит десятки килобайт. */
  fileBytes: 2 * 1024 * 1024,
  /** Сумма распакованных частей xlsx: защита от архива-бомбы. */
  unzippedBytes: 25 * 1024 * 1024,
  /** Во сколько раз часть архива может разжаться. Обычный xlsx — ×5–×15. */
  compressionRatio: 100,
  /** Частей внутри xlsx: у живого файла их двадцать-тридцать. */
  zipEntries: 300,
  sheets: 10,
  rowsPerSheet: 3000,
  columns: 60,
  cellsTotal: 60_000,
  cellChars: 500,
  guests: 1500,
  /** Сколько строк листа показываем ИИ, чтобы он понял устройство таблицы. */
  aiSampleRows: 25,
  /** Сложных ячеек в одном запросе к ИИ. */
  aiBatchCells: 40,
  /** Запросов к ИИ на один импорт — дальше разбираем правилами. */
  aiRequests: 25,
  /** Токенов на один импорт (вход + выход). */
  aiTokens: 60_000,
  aiTimeoutMs: 25_000,
  /** Разборов на мероприятие в час и на организацию в сутки. */
  perEventHour: 10,
  perOrgDay: 30,
} as const;

/** Понятная организатору причина отказа. Текст показывается как есть. */
export class ImportError extends Error {
  constructor(
    readonly code:
      | "too-big" | "empty" | "format" | "xls" | "macro" | "encrypted" | "bomb"
      | "too-many-rows" | "too-many-sheets" | "no-guests" | "rate" | "busy" | "broken",
    message: string,
  ) {
    super(message);
  }
}

export const formatBytes = (bytes: number, lang: Lang = "ru") =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".0", "")} ${lang === "en" ? "MB" : "МБ"}`
    : `${Math.ceil(bytes / 1024)} ${lang === "en" ? "KB" : "КБ"}`;
