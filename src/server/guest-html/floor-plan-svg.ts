/**
 * План зала строкой SVG — для гостевых страниц, написанных без React.
 *
 * Четвёртый потребитель той же геометрии (`lib/seating-geometry.ts`):
 * редактор, просмотр в панели, PDF и вот эта строка. Формула по-прежнему
 * одна — иначе гость на телефоне и координатор с распечаткой увидят
 * разные планы, и спорить они будут в день свадьбы.
 *
 * Почему строкой, а не компонентом: страницы `/e/*` намеренно отдаются
 * без рантайма React (CLAUDE.md, решение 1) — это пиковая нагрузка входа,
 * и 174 КБ там неуместны. SVG рисуется теми же тремя примитивами.
 */
import { PLAN_HEIGHT, PLAN_WIDTH, isRound, seatPosition } from "@/lib/seating-geometry";
import { esc } from "@/server/guest-html/layout";

export type PlanTable = {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  taken: number;
};

/** Округление до трёх знаков: длинные дроби раздувают разметку без пользы. */
const n = (value: number) => Math.round(value * 1000) / 1000;

export function floorPlanSvg(tables: PlanTable[], highlightTableId?: string | null): string {
  if (tables.length === 0) return "";

  const shapes = tables
    .map((table) => {
      const highlighted = table.id === highlightTableId;
      const fill = highlighted ? "#1c1917" : "#e7e5e4";
      const stroke = highlighted ? "#1c1917" : "#a8a29e";
      const textFill = highlighted ? "#ffffff" : "#44403c";

      const body = isRound(table.shape)
        ? `<ellipse cx="${n(table.x)}" cy="${n(table.y)}" rx="${n(table.width / 2)}" ry="${n(table.height / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
        : `<rect x="${n(table.x - table.width / 2)}" y="${n(table.y - table.height / 2)}" width="${n(table.width)}" height="${n(table.height)}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

      // Места рисуем точками: гостю важно «этот стол вон там», а не номер
      // стула — номер он и так услышит от координатора.
      const seats = Array.from({ length: table.capacity }, (_, index) => {
        const point = seatPosition(table, index);
        const occupied = index < table.taken;
        return `<circle cx="${n(point.x)}" cy="${n(point.y)}" r="7" fill="${occupied ? "#a8a29e" : "#f5f5f4"}" stroke="#d6d3d1" stroke-width="1.5"/>`;
      }).join("");

      const label = `<text x="${n(table.x)}" y="${n(table.y + 6)}" text-anchor="middle" font-size="20" font-family="sans-serif" fill="${textFill}">${esc(table.label)}</text>`;

      return seats + body + label;
    })
    .join("");

  return `<svg viewBox="0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}" class="plan" role="img" aria-label="План зала">
<rect x="0" y="0" width="${PLAN_WIDTH}" height="${PLAN_HEIGHT}" fill="#fbfaf8"/>
${shapes}
</svg>`;
}
