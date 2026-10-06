/**
 * Подписи мест: имя стоит строго у своего места и подстраивается под
 * шаг мест — одна строка, две строки или наклон. Геометрия общая для
 * редактора, плана и PDF.
 */
import { describe, expect, it } from "vitest";
import { fitSeatLabels, labelLines, placeSeatLabel, seatPosition, seatSpacing } from "@/lib/seating-geometry";

const table = (shape: string, capacity: number, width: number, height = 92) =>
  ({ x: 500, y: 350, width, height, shape, capacity, isCouple: false });

const names = ["Роман Орлов", "Лев Сорокин", "Вера Суворова", "Фёдор Орлов", "Вадим Зуев", "Пётр Сорокин", "Зарина Каримова"];

describe("подписи мест", () => {
  it("на просторном столе имя в одну строку и без наклона", () => {
    const fit = fitSeatLabels(table("ROUND", 8, 120, 120), names, { base: 10, min: 7, unit: 1.4 });
    expect(fit).toMatchObject({ twoLines: false, tilted: false, fontSize: 10 });
  });

  it("на тесном столе фамилия уходит на вторую строку, а кегль не меньше минимального", () => {
    const long = table("RECT", 14, 336);
    const fit = fitSeatLabels(long, names, { base: 11, min: 9, unit: 1.3 });
    expect(fit.twoLines).toBe(true);
    expect(fit.tilted).toBe(false);
    expect(fit.fontSize).toBeGreaterThanOrEqual(9);
    expect(labelLines("Вера Суворова", fit)).toEqual(["В.", "Суворова"]);
    // Самая длинная строка помещается в шаг мест.
    expect("Каримова".length * 0.58 * fit.fontSize).toBeLessThanOrEqual(seatSpacing(long) * 1.3);
  });

  it("на узком экране подписи наклоняются, а не налезают", () => {
    const fit = fitSeatLabels(table("RECT", 14, 336), names, { base: 11, min: 9, unit: 0.6 });
    expect(fit.tilted).toBe(true);
  });

  it("подпись у прямоугольного стола стоит ровно над или под своим местом", () => {
    const long = table("RECT", 14, 336);
    const fit = fitSeatLabels(long, names, { base: 11, min: 9, unit: 1.3 });
    for (let i = 0; i < 14; i++) {
      const seat = seatPosition(long, i);
      const label = placeSeatLabel(long, i, fit);
      expect(label.x).toBe(seat.x);
      expect(label.baseline).toBe(seat.y < long.y ? "bottom" : "top");
      expect(Math.sign(label.y - seat.y)).toBe(seat.y < long.y ? -1 : 1);
    }
  });

  it("наклонённые подписи верхнего ряда идут вверх, нижнего — вниз", () => {
    const long = table("RECT", 14, 336);
    const fit = { fontSize: 9, twoLines: false, tilted: true };
    expect(placeSeatLabel(long, 0, fit).angle).toBeLessThan(0);
    expect(placeSeatLabel(long, 7, fit).angle).toBeGreaterThan(0);
  });
});
