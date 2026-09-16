/**
 * Геометрия плана зала — ОДНА формула на три потребителя: редактор с
 * перетаскиванием, просмотр на странице и PDF.
 *
 * Раньше расчёт позиций мест был скопирован в SVG-компоненте и в генераторе
 * PDF. Пока это два места, расхождение незаметно; на третьем потребителе
 * (редактор) рассадка начала бы выглядеть по-разному в редакторе и в
 * распечатке — а распечатка это план Б на день свадьбы.
 *
 * Координаты условные (PLAN.md §4.7): сетка 1000×700, никаких пикселей.
 * Один и тот же план должен одинаково лечь на монитор, на телефон и на A4.
 */
import type { TableShape } from "@/generated/prisma/enums";

/** Размер зала по умолчанию. У мероприятия свой размер (`Event.hallWidth/hallHeight`),
 *  эти числа — для старых планов и демо на титульной. */
export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 700;

export type Hall = { width: number; height: number };

export const DEFAULT_HALL: Hall = { width: PLAN_WIDTH, height: PLAN_HEIGHT };

/** Меньше — на плане не поместится и пара столов; больше — зал на экране
 *  превращается в прокрутку без конца. */
export const HALL_MIN: Hall = { width: 600, height: 400 };
export const HALL_MAX: Hall = { width: 3000, height: 2000 };

/** Стол молодожёнов: пара и свидетели, но не банкетный стол на двадцать. */
export const COUPLE_MIN_SEATS = 2;
export const COUPLE_MAX_SEATS = 12;
export const COUPLE_TABLE_LABEL = "Стол молодожёнов";

/** Радиус кружка места в условных единицах. */
export const SEAT_RADIUS = 11;

export type Point = { x: number; y: number };

export type TableGeometry = {
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  /** Стол молодожёнов: места в один ряд лицом к залу. */
  isCouple?: boolean;
};

export function isRound(shape: string): boolean {
  return shape === "ROUND" || shape === "OVAL";
}

/** Человеческие названия форм — для форм и подписей. */
export const SHAPE_LABEL: Record<TableShape, string> = {
  ROUND: "круглый",
  RECT: "прямоугольный",
  OVAL: "овальный",
  HEAD: "президиум",
};

export const SHAPES: readonly TableShape[] = ["ROUND", "RECT", "OVAL", "HEAD"];

/**
 * Габариты стола по форме и вместимости.
 *
 * Форма — не украшение: круглый сажает гостей лицом друг к другу,
 * прямоугольный вдоль двух сторон, президиум только с одной. Размер обязан
 * следовать за формой и вместимостью, иначе места налезают друг на друга:
 * восемь стульев вокруг «квадрата» шириной 120 стоят вплотную, а вокруг
 * круга того же диаметра — свободно.
 *
 * Числа подобраны так, чтобы между соседними местами оставалось хотя бы
 * два радиуса кружка (`SEAT_RADIUS`), — проверено тестом.
 */
export function shapeSize(shape: string, capacity: number): { width: number; height: number } {
  const seats = Math.max(1, capacity);

  if (shape === "ROUND") {
    // Длина окружности должна вместить все места с зазором.
    const diameter = Math.max(96, Math.round((seats * (SEAT_RADIUS * 3.4)) / Math.PI));
    return { width: diameter, height: diameter };
  }

  if (shape === "OVAL") {
    const perSide = Math.ceil(seats / 2);
    return { width: Math.max(140, perSide * 46), height: 96 };
  }

  if (shape === "HEAD") {
    // Президиум: гости сидят с одной стороны, стол длинный и неглубокий.
    return { width: Math.max(180, seats * 62), height: 76 };
  }

  // RECT: места по двум длинным сторонам.
  const perSide = Math.ceil(seats / 2);
  return { width: Math.max(130, perSide * 48), height: 92 };
}

/** Габариты с учётом стола молодожёнов — его размер от формы не зависит. */
export function tableSize(table: { shape: string; capacity: number; isCouple?: boolean }) {
  if (table.isCouple) {
    const seats = Math.max(COUPLE_MIN_SEATS, table.capacity);
    return { width: Math.max(220, seats * 64), height: 84 };
  }
  return shapeSize(table.shape, table.capacity);
}

/**
 * Номер места за столом молодожёнов → позиция в ряду слева направо.
 *
 * Места 0 и 1 — всегда центр: невеста и жених. Остальные расходятся от
 * них в стороны по очереди. Так пара остаётся в центре при любом числе
 * мест: новое место добавляется с краю, а не сдвигает молодых вбок.
 */
export function coupleSlot(index: number, count: number): number {
  const leftCenter = Math.floor((count - 1) / 2);
  return index % 2 === 0 ? leftCenter - index / 2 : leftCenter + 1 + (index - 1) / 2;
}

/** Где стоит место с номером index. */
export function seatPosition(table: TableGeometry, index: number): Point {
  const count = Math.max(table.capacity, 1);

  if (table.isCouple) {
    // Один ряд за столом, лицом к залу: гости смотрят на молодых, а не в спину.
    const step = table.width / (count + 1);
    return {
      x: table.x - table.width / 2 + step * (coupleSlot(index, count) + 1),
      y: table.y - (table.height / 2 + 22),
    };
  }

  if (isRound(table.shape)) {
    // Отсчёт от «двенадцати часов» и по часовой стрелке — так же, как
    // организатор считает места вслух, обходя стол.
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: table.x + Math.cos(angle) * (table.width / 2 + 26),
      y: table.y + Math.sin(angle) * (table.height / 2 + 26),
    };
  }

  // Прямоугольный стол и президиум: места по двум длинным сторонам.
  const perSide = Math.ceil(count / 2);
  const side = index < perSide ? -1 : 1;
  const pos = index % perSide;
  const step = table.width / (perSide + 1);
  return {
    x: table.x - table.width / 2 + step * (pos + 1),
    y: table.y + side * (table.height / 2 + 22),
  };
}

/**
 * Куда отнести подпись места: наружу от центра стола.
 * Если ставить подпись всегда вниз, имена верхних мест ложатся на стол.
 */
export function labelPosition(table: TableGeometry, seat: Point, extraOut = 0): Point {
  const dx = seat.x - table.x;
  const dy = seat.y - table.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: seat.x + (dx / len) * (6 + extraOut),
    y: seat.y + (dy / len) * (22 + extraOut) + 5,
  };
}

/**
 * Насколько отодвинуть подпись, если на месте стоит значок молодожёнов.
 * Значок крупнее кружка места и без этого сдвига накрывает имя —
 * «А. П🌸ова» вместо «А. Петрова».
 */
export const MARK_LABEL_SHIFT = 10;

/** Подпись у места: «Анастасия Петрова» → «А. Петрова».
 *  Полное имя не влезает между двумя соседними местами круглого стола. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0]}. ${parts[1]}`;
}

/** Габариты стола вместе с местами и подписями — нужны, чтобы стол
 *  не утаскивали за край плана. */
export function tableBounds(table: TableGeometry) {
  const pad = isRound(table.shape) && !table.isCouple ? 40 : 34;
  return {
    halfWidth: table.width / 2 + pad,
    halfHeight: table.height / 2 + pad,
  };
}

/** Не даём утащить стол за границы зала. */
export function clampToPlan(table: TableGeometry, point: Point, hall: Hall = DEFAULT_HALL): Point {
  const { halfWidth, halfHeight } = tableBounds(table);
  return {
    x: Math.min(Math.max(point.x, halfWidth), Math.max(halfWidth, hall.width - halfWidth)),
    y: Math.min(Math.max(point.y, halfHeight), Math.max(halfHeight, hall.height - halfHeight)),
  };
}

/**
 * Ближайшая к точке позиция, где стол не заденет соседей.
 *
 * Новый стол, поставленный щелчком, и стол молодожёнов вставали ровно
 * в центр или к верхней стене — поверх уже стоящих, и их приходилось
 * растаскивать руками. Поиск идёт квадратными кольцами от желаемой точки
 * с шагом сетки. Если в зале нет места целиком, стол встаёт туда, где
 * меньше всего налезает на соседей, — дальше организатор растянет зал.
 */
export function freeSpot(
  table: Omit<TableGeometry, "x" | "y">,
  others: TableGeometry[],
  hall: Hall,
  around: Point,
): Point {
  const own = tableBounds({ ...table, x: 0, y: 0 });
  const boxes = others.map((other) => ({ other, bounds: tableBounds(other) }));
  /** Площадь, на которую стол в точке p налезает на соседей; 0 — свободно. */
  const overlap = (p: Point) =>
    boxes.reduce((sum, { other, bounds }) => {
      const dx = own.halfWidth + bounds.halfWidth - Math.abs(p.x - other.x);
      const dy = own.halfHeight + bounds.halfHeight - Math.abs(p.y - other.y);
      return dx > 0 && dy > 0 ? sum + dx * dy : sum;
    }, 0);
  const place = (p: Point) => {
    const clamped = clampToPlan({ ...table, x: 0, y: 0 }, p, hall);
    return { x: snap(clamped.x), y: snap(clamped.y) };
  };

  const start = place(around);
  let best = { spot: start, cost: overlap(start) };
  if (best.cost === 0) return start;

  const step = SNAP_STEP * 2;
  const limit = Math.max(hall.width, hall.height);
  for (let radius = step; radius <= limit; radius += step) {
    const ring: Point[] = [];
    for (let d = -radius; d <= radius; d += step) {
      ring.push(
        { x: start.x + d, y: start.y - radius },
        { x: start.x + d, y: start.y + radius },
        { x: start.x - radius, y: start.y + d },
        { x: start.x + radius, y: start.y + d },
      );
    }
    ring.sort(
      (p, q) => Math.hypot(p.x - start.x, p.y - start.y) - Math.hypot(q.x - start.x, q.y - start.y),
    );
    for (const candidate of ring) {
      const spot = place(candidate);
      // Кандидат за стеной прижимается к ней и повторяет соседний — пропускаем.
      if (spot.x !== candidate.x || spot.y !== candidate.y) continue;
      const cost = overlap(spot);
      if (cost === 0) return spot;
      if (cost < best.cost) best = { spot, cost };
    }
  }
  return best.spot;
}

/** Занятая столами область: от неё зависит, насколько зал можно ужать. */
export function contentExtent(tables: TableGeometry[]) {
  if (tables.length === 0) return null;
  const boxes = tables.map((table) => {
    const { halfWidth, halfHeight } = tableBounds(table);
    return {
      left: table.x - halfWidth, right: table.x + halfWidth,
      top: table.y - halfHeight, bottom: table.y + halfHeight,
    };
  });
  return {
    left: Math.min(...boxes.map((b) => b.left)),
    right: Math.max(...boxes.map((b) => b.right)),
    top: Math.min(...boxes.map((b) => b.top)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
}

/** Небольшой допуск: стол, стоящий вплотную к стене, не должен мешать
 *  на полпикселя из-за округления. */
const EDGE_TOLERANCE = 0.5;

/**
 * Помещаются ли столы в зал после изменения размера.
 *
 * @param shift на сколько сдвигаются все столы — зал растянули за левый
 *        или верхний край, и столы должны остаться у своих стен.
 */
export function hallFits(tables: TableGeometry[], hall: Hall, shift: Point = { x: 0, y: 0 }): boolean {
  if (hall.width < HALL_MIN.width || hall.height < HALL_MIN.height) return false;
  if (hall.width > HALL_MAX.width || hall.height > HALL_MAX.height) return false;
  const extent = contentExtent(tables);
  if (!extent) return true;
  return (
    extent.left + shift.x >= -EDGE_TOLERANCE &&
    extent.top + shift.y >= -EDGE_TOLERANCE &&
    extent.right + shift.x <= hall.width + EDGE_TOLERANCE &&
    extent.bottom + shift.y <= hall.height + EDGE_TOLERANCE
  );
}

/** Шаг привязки при перетаскивании стола: без него столы стоят «почти
 *  ровно», и план выглядит неаккуратно и в редакторе, и в распечатке. */
export const SNAP_STEP = 10;

export function snap(value: number, step = SNAP_STEP): number {
  return Math.round(value / step) * step;
}
