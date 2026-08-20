/**
 * Поиск гостя по имени на входе в зал — самая рискованная функция сервиса.
 *
 * Три слоя (PLAN.md §1.4), выполняются по порядку, останавливаемся на первом
 * непустом результате:
 *   1. точное совпадение нормализованного ключа или алиаса — мгновенно;
 *   2. префикс/подстрока по словам — «петров» находит «Пётр Петров»;
 *   3. триграммное сходство — вытягивает опечатки.
 *
 * Ограничения, которые здесь не декоративные:
 *   — пустой или односимвольный запрос не возвращает НИЧЕГО. Иначе форма
 *     входа превращается в выгрузку списка гостей для любого, кто знает код;
 *   — не больше MAX_RESULTS совпадений. При большем числе просим уточнить.
 */
import { db } from "@/server/db";
import { isSearchable, normalizeName } from "@/lib/name-normalize";
import { expandQuery } from "@/server/services/diminutives";

export const MAX_RESULTS = 5;

/** Подобран на реальных опечатках, см. src/tests/guest-search.spec.ts.
 *  Ниже 0.3 начинают лезть однофамильцы, выше 0.45 теряются перестановки букв. */
export const SIMILARITY_THRESHOLD = 0.34;

export type GuestMatch = {
  guestId: string;
  displayName: string;
  tableLabel: string | null;
  seatIndex: number | null;
  /** exact | prefix | fuzzy — для тестов и отладки, наружу не отдаётся */
  via: "exact" | "prefix" | "fuzzy";
  score: number;
};

export type SearchOutcome =
  | { status: "too_short" }
  | { status: "not_found" }
  | { status: "too_many"; count: number }
  | { status: "ok"; matches: GuestMatch[] };

type Row = {
  guestId: string;
  displayName: string;
  tableLabel: string | null;
  seatIndex: number | null;
  score: number;
};

/**
 * SQL пишется руками, а не через Prisma: нужен similarity(), GREATEST по
 * гостю и алиасам, и один проход по индексу вместо нескольких запросов.
 * eventId всегда параметр — кросс-арендной утечки здесь быть не может.
 */
async function queryExact(eventId: string, variants: string[]): Promise<Row[]> {
  return db.$queryRaw<Row[]>`
    SELECT g.id                         AS "guestId",
           g."displayName"              AS "displayName",
           t.label                      AS "tableLabel",
           s.index                      AS "seatIndex",
           1.0::float                   AS score
    FROM guests g
    LEFT JOIN seats s       ON s."eventId" = g."eventId" AND s."guestId" = g.id
    LEFT JOIN seat_tables t ON t."eventId" = g."eventId" AND t.id = s."tableId"
    WHERE g."eventId" = ${eventId}
      AND g."archivedAt" IS NULL
      AND (
        g."searchKey" = ANY(${variants}::text[])
        OR EXISTS (
          SELECT 1 FROM guest_aliases a
          WHERE a."guestId" = g.id AND a.alias = ANY(${variants}::text[])
        )
      )
    LIMIT ${MAX_RESULTS + 1}
  `;
}

/** Совпадение по началу слова: гость ввёл только фамилию или только имя. */
async function queryPrefix(eventId: string, variants: string[]): Promise<Row[]> {
  const patterns = variants.flatMap((v) => [`${v}%`, `% ${v}%`]);
  return db.$queryRaw<Row[]>`
    SELECT g.id            AS "guestId",
           g."displayName" AS "displayName",
           t.label         AS "tableLabel",
           s.index         AS "seatIndex",
           0.9::float      AS score
    FROM guests g
    LEFT JOIN seats s       ON s."eventId" = g."eventId" AND s."guestId" = g.id
    LEFT JOIN seat_tables t ON t."eventId" = g."eventId" AND t.id = s."tableId"
    WHERE g."eventId" = ${eventId}
      AND g."archivedAt" IS NULL
      AND (
        g."searchKey" LIKE ANY(${patterns}::text[])
        OR EXISTS (
          SELECT 1 FROM guest_aliases a
          WHERE a."guestId" = g.id AND a.alias LIKE ANY(${patterns}::text[])
        )
      )
    ORDER BY length(g."searchKey")
    LIMIT ${MAX_RESULTS + 1}
  `;
}

/**
 * Триграммное сходство. Берём максимум по всем вариантам запроса и по всем
 * алиасам гостя: гостя достаточно найти хоть одним написанием.
 */
async function queryFuzzy(eventId: string, variants: string[]): Promise<Row[]> {
  return db.$queryRaw<Row[]>`
    WITH q AS (SELECT unnest(${variants}::text[]) AS term),
    scored AS (
      SELECT g.id            AS "guestId",
             g."displayName" AS "displayName",
             t.label         AS "tableLabel",
             s.index         AS "seatIndex",
             GREATEST(
               (SELECT MAX(similarity(g."searchKey", q.term)) FROM q),
               COALESCE((
                 SELECT MAX(similarity(a.alias, q.term))
                 FROM guest_aliases a, q
                 WHERE a."guestId" = g.id
               ), 0)
             ) AS score
      FROM guests g
      LEFT JOIN seats s       ON s."eventId" = g."eventId" AND s."guestId" = g.id
      LEFT JOIN seat_tables t ON t."eventId" = g."eventId" AND t.id = s."tableId"
      WHERE g."eventId" = ${eventId}
        AND g."archivedAt" IS NULL
    )
    SELECT * FROM scored
    WHERE score >= ${SIMILARITY_THRESHOLD}
    ORDER BY score DESC, "displayName"
    LIMIT ${MAX_RESULTS + 1}
  `;
}

export async function searchGuests(eventId: string, rawQuery: string): Promise<SearchOutcome> {
  if (!isSearchable(rawQuery)) return { status: "too_short" };

  const normalized = normalizeName(rawQuery);
  const variants = Array.from(new Set([normalized, ...expandQuery(rawQuery)]));

  const layers: [Row[], GuestMatch["via"]][] = [];
  layers.push([await queryExact(eventId, variants), "exact"]);
  if (layers[0][0].length === 0) layers.push([await queryPrefix(eventId, variants), "prefix"]);
  if (layers[layers.length - 1][0].length === 0) {
    layers.push([await queryFuzzy(eventId, variants), "fuzzy"]);
  }

  const [rows, via] = layers[layers.length - 1];
  if (rows.length === 0) return { status: "not_found" };

  // Слишком общий запрос («а») — не показываем полсписка, просим уточнить.
  if (rows.length > MAX_RESULTS) return { status: "too_many", count: rows.length };

  return {
    status: "ok",
    matches: rows.map((r) => ({
      guestId: r.guestId,
      displayName: r.displayName,
      tableLabel: r.tableLabel,
      seatIndex: r.seatIndex,
      via,
      score: Number(r.score),
    })),
  };
}
