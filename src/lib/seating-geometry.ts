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

export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 700;

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

/** Где стоит место с номером index. */
export function seatPosition(table: TableGeometry, index: number): Point {
  const count = Math.max(table.capacity, 1);

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
  const pad = isRound(table.shape) ? 40 : 34;
  return {
    halfWidth: table.width / 2 + pad,
    halfHeight: table.height / 2 + pad,
  };
}

/** Не даём утащить стол за границы зала. */
export function clampToPlan(table: TableGeometry, point: Point): Point {
  const { halfWidth, halfHeight } = tableBounds(table);
  return {
    x: Math.min(Math.max(point.x, halfWidth), PLAN_WIDTH - halfWidth),
    y: Math.min(Math.max(point.y, halfHeight), PLAN_HEIGHT - halfHeight),
  };
}

/** Шаг привязки при перетаскивании стола: без него столы стоят «почти
 *  ровно», и план выглядит неаккуратно и в редакторе, и в распечатке. */
export const SNAP_STEP = 10;

export function snap(value: number, step = SNAP_STEP): number {
  return Math.round(value / step) * step;
}
