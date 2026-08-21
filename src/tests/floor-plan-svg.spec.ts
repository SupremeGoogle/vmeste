/**
 * План зала строкой SVG — четвёртый потребитель общей геометрии.
 *
 * Проверяется то, из-за чего эту строку вообще написали: гость видит тот
 * же план, что организатор и распечатка, и подпись стола не ломает
 * разметку, как бы её ни назвали.
 */
import { describe, expect, it } from "vitest";
import { floorPlanSvg } from "@/server/guest-html/floor-plan-svg";
import { seatPosition } from "@/lib/seating-geometry";

const table = (over: Partial<Parameters<typeof floorPlanSvg>[0][number]> = {}) => ({
  id: "t1",
  label: "Стол 1",
  shape: "ROUND",
  x: 300,
  y: 250,
  width: 120,
  height: 120,
  capacity: 8,
  taken: 3,
  ...over,
});

describe("план зала для гостя", () => {
  it("рисует круглый стол эллипсом, прямоугольный — прямоугольником", () => {
    expect(floorPlanSvg([table()])).toContain("<ellipse");
    expect(floorPlanSvg([table({ shape: "RECT" })])).toContain("<rect x=");
  });

  it("ставит места там же, где их считает общая геометрия", () => {
    const svg = floorPlanSvg([table()]);
    const first = seatPosition(table(), 0);
    expect(svg).toContain(`cx="${Math.round(first.x * 1000) / 1000}"`);
  });

  it("подсвечивает нужный стол и только его", () => {
    const svg = floorPlanSvg([table(), table({ id: "t2", label: "Стол 2", x: 700 })], "t2");
    const dark = svg.split('fill="#1c1917"').length - 1;
    expect(dark).toBe(1);
  });

  it("экранирует название стола — его пишет человек", () => {
    const svg = floorPlanSvg([table({ label: '<script>alert("стол")</script>' })]);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("на пустом зале возвращает пустоту, а не сломанный svg", () => {
    expect(floorPlanSvg([])).toBe("");
  });
});
