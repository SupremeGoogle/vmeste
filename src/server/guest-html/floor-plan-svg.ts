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
import { MARK_RADIUS, markFor, hasCouple } from "@/lib/couple-marks";
import { COLORS } from "@/server/guest-html/theme";
import { esc } from "@/server/guest-html/layout";
import type { GuestRole } from "@/generated/prisma/enums";

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
  /** Роль сидящего на каждом месте: по ней рисуются значки молодожёнов. */
  roles?: GuestRole[];
};

/** Легенда под планом: без неё букет и бабочка — просто два кружка. */
function coupleLegend(): string {
  return `<p class="legend">
<span>${coupleGlyph("BRIDE")} невеста</span>
<span>${coupleGlyph("GROOM")} жених</span>
</p>`;
}

function coupleGlyph(role: GuestRole): string {
  return `<svg class="glyph" viewBox="-16 -16 32 32" aria-hidden="true">${coupleMark(role, 0, 0, true)}</svg>`;
}

/** Округление до трёх знаков: длинные дроби раздувают разметку без пользы. */
const n = (value: number) => Math.round(value * 1000) / 1000;

/** Значок молодожёнов: те же фигуры, что в панели и в PDF. */
function coupleMark(role: GuestRole, x: number, y: number, decorative = false): string {
  const mark = markFor(role);
  if (!mark) return "";

  const figure = mark.shapes
    .map((shape) => {
      // Фигура светлая на золотом кружке; «вырез» — тот же золотой,
      // фата — светлая вполсилы.
      const fill = shape.tone === "hole" ? COLORS.accent : COLORS.card;
      const opacity = shape.tone === "veil" ? ` opacity="0.45"` : "";

      if (shape.kind === "circle") {
        return `<circle cx="${n(shape.cx)}" cy="${n(shape.cy)}" r="${n(shape.r)}" fill="${fill}"${opacity}/>`;
      }
      if (shape.kind === "polygon") {
        return `<polygon points="${shape.points}" fill="${fill}"${opacity}/>`;
      }
      return `<path d="${shape.d}" fill="${fill}"${opacity}/>`;
    })
    .join("");

  // В легенде значок декоративный: рядом с ним стоит слово, и читать
  // «невеста невеста» экранному диктору незачем.
  const label = decorative
    ? ` aria-hidden="true"`
    : ` role="img" aria-label="${esc(mark.label)}"`;

  return `<g transform="translate(${n(x)} ${n(y)})"${label}>
<circle r="${MARK_RADIUS}" fill="${COLORS.accent}" stroke="${COLORS.card}" stroke-width="1.5"/>
${figure}</g>`;
}

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
      // стула — номер он и так услышит от координатора. Исключение —
      // молодожёны: их места помечены значком, потому что «а где сидят
      // молодые» спрашивают все.
      const seats = Array.from({ length: table.capacity }, (_, index) => {
        const point = seatPosition(table, index);
        const role = table.roles?.[index] ?? "GUEST";
        if (role !== "GUEST") return coupleMark(role, point.x, point.y);

        const occupied = index < table.taken;
        return `<circle cx="${n(point.x)}" cy="${n(point.y)}" r="7" fill="${occupied ? "#cfc4b2" : COLORS.card}" stroke="#d6cec2" stroke-width="1.5"/>`;
      }).join("");

      const label = `<text x="${n(table.x)}" y="${n(table.y + 6)}" text-anchor="middle" font-size="20" font-family="sans-serif" fill="${textFill}">${esc(table.label)}</text>`;

      return seats + body + label;
    })
    .join("");

  const roles = tables.flatMap((table) => table.roles ?? []);

  return `<svg viewBox="0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}" class="plan" role="img" aria-label="План зала">
<rect x="0" y="0" width="${PLAN_WIDTH}" height="${PLAN_HEIGHT}" fill="${COLORS.card}"/>
${shapes}
</svg>${hasCouple(roles) ? coupleLegend() : ""}`;
}
