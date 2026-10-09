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
import { DEFAULT_HALL, isRound, seatPosition, type Hall } from "@/lib/seating-geometry";
import { COUPLE_TABLE } from "@/lib/couple-table-style";
import { MARK_RADIUS, markFor, hasCouple } from "@/lib/couple-marks";
import { COLORS } from "@/server/guest-html/theme";
import { esc } from "@/server/guest-html/layout";
import { gl } from "@/server/guest-html/guest-lang";
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
  isCouple?: boolean;
  taken: number;
  /** Роль сидящего на каждом месте: по ней рисуются значки молодожёнов. */
  roles?: GuestRole[];
};

/** Легенда под планом: без неё букет и бабочка — просто два кружка. */
function coupleLegend(): string {
  return `<p class="legend">
<span>${coupleGlyph("BRIDE")} ${gl("невеста", "bride")}</span>
<span>${coupleGlyph("GROOM")} ${gl("жених", "groom")}</span>
</p>`;
}

function coupleGlyph(role: GuestRole): string {
  return `<svg class="glyph" viewBox="-16 -16 32 32" aria-hidden="true">${coupleMark(role, 0, 0, true)}</svg>`;
}

/** Округление до трёх знаков: длинные дроби раздувают разметку без пользы. */
const n = (value: number) => Math.round(value * 1000) / 1000;

/** Масштаб, ниже которого план не ужимается: подписи столов ~12 px. */
const PLAN_SCALE = 0.62;

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

/** Стол молодожёнов: двойная золотая рамка и кольца над названием. */
function coupleBody(table: PlanTable, highlighted: boolean): string {
  const left = table.x - table.width / 2;
  const top = table.y - table.height / 2;
  const inset = COUPLE_TABLE.innerInset;
  const fill = highlighted ? "#1c1917" : COUPLE_TABLE.fill;
  const rings = COUPLE_TABLE.rings
    .map(
      (ring) =>
        `<circle cx="${n(table.x + ring.cx)}" cy="${n(table.y + ring.cy)}" r="${ring.r}" fill="none" stroke="${highlighted ? "#ffffff" : COUPLE_TABLE.ringStroke}" stroke-width="2"/>`,
    )
    .join("");
  return `<rect x="${n(left)}" y="${n(top)}" width="${n(table.width)}" height="${n(table.height)}" rx="14" fill="${fill}" stroke="${COUPLE_TABLE.stroke}" stroke-width="3"/>
<rect x="${n(left + inset)}" y="${n(top + inset)}" width="${n(table.width - inset * 2)}" height="${n(table.height - inset * 2)}" rx="9" fill="none" stroke="${COUPLE_TABLE.innerStroke}" stroke-width="1.5"/>${rings}`;
}

export function floorPlanSvg(
  tables: PlanTable[],
  highlightTableId?: string | null,
  hall: Hall = DEFAULT_HALL,
): string {
  if (tables.length === 0) return "";

  const shapes = tables
    .map((table) => {
      const highlighted = table.id === highlightTableId;
      const fill = highlighted ? "#1c1917" : "#e7e5e4";
      const stroke = highlighted ? "#1c1917" : "#a8a29e";
      const textFill = highlighted ? "#ffffff" : "#44403c";

      const body = table.isCouple
        ? coupleBody(table, highlighted)
        : isRound(table.shape)
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

      const labelY = table.isCouple ? table.y + COUPLE_TABLE.labelOffset : table.y + 6;
      const labelFill = table.isCouple && !highlighted ? COUPLE_TABLE.text : textFill;
      const label = `<text x="${n(table.x)}" y="${n(labelY)}" text-anchor="middle" font-size="20" font-family="sans-serif" fill="${labelFill}">${esc(table.label)}</text>`;

      return seats + body + label;
    })
    .join("");

  const roles = tables.flatMap((table) => table.roles ?? []);

  // Телефон в 375 px ужимал зал 1580 × 960 до подписей высотой 5 px.
  // Теперь у плана есть нижняя граница ширины: подпись в 20 единиц
  // становится ~12 px, а то, что не влезло, листается пальцем вбок.
  const minWidth = Math.round(hall.width * PLAN_SCALE);
  const focus = tables.find((table) => table.id === highlightTableId);
  const focusAttr = focus ? ` data-focus="${n(focus.x / hall.width)}"` : "";

  return `<div class="plan-scroll"${focusAttr}><svg viewBox="0 0 ${n(hall.width)} ${n(hall.height)}" class="plan" style="min-width:${minWidth}px" role="img" aria-label="${gl("План зала", "Floor plan")}">
<rect x="0" y="0" width="${n(hall.width)}" height="${n(hall.height)}" fill="${COLORS.card}"/>
${shapes}
</svg></div><p class="plan-swipe" hidden>${gl("Листайте план в сторону", "Swipe sideways to see the whole plan")}</p>${hasCouple(roles) ? coupleLegend() : ""}`;
}

/**
 * Скрипт к плану: доводит подсвеченный стол до середины экрана и
 * показывает подсказку, если план шире экрана. Без скрипта план всё
 * равно листается — просто начинается с левого края.
 */
export const PLAN_SCROLL_SCRIPT = `(function(){var s=document.querySelector(".plan-scroll");if(!s)return;
var f=parseFloat(s.getAttribute("data-focus"));
if(f>=0)s.scrollLeft=f*s.scrollWidth-s.clientWidth/2;
var h=document.querySelector(".plan-swipe");if(h&&s.scrollWidth>s.clientWidth+4)h.hidden=false;})();`;
