/**
 * Нижняя граница шрифта в приглашениях.
 *
 * Шаблоны пришли с макетов для компьютера: подписи, дни недели и единицы
 * отсчёта там по 7–10 px. На телефоне это не читается, поэтому итоговый
 * CSS проходит через `floorFontSizes`. Проверяется, что граница ставится
 * и в `font-size`, и в сокращённом `font`, и что не ломается то, что
 * `max()` не принимает.
 */
import { describe, expect, it } from "vitest";
import { floorFontSizes } from "@/server/guest-html/mobile-density";

describe("нижняя граница шрифта", () => {
  it("оборачивает font-size в max()", () => {
    expect(floorFontSizes(".a{font-size:.55rem}")).toBe(".a{font-size:max(11px,.55rem)}");
    expect(floorFontSizes(".a{font-size: 9px;color:red}")).toBe(".a{font-size:max(11px,9px);color:red}");
  });

  it("сохраняет !important", () => {
    expect(floorFontSizes(".a{font-size:.6rem!important}")).toBe(".a{font-size:max(11px,.6rem)!important}");
    expect(floorFontSizes(".a{font-size:clamp(.6rem,2vw,.8rem) !important}")).toBe(
      ".a{font-size:max(11px,clamp(.6rem,2vw,.8rem)) !important}",
    );
  });

  it("находит размер в сокращённом font после насыщенности и начертания", () => {
    expect(floorFontSizes(".a{font:600 .55rem var(--sans)}")).toBe(".a{font:600 max(11px,.55rem) var(--sans)}");
    expect(floorFontSizes(".a{font:italic 400 .8em/1.2 var(--serif)}")).toBe(
      ".a{font:italic 400 max(11px,.8em)/1.2 var(--serif)}",
    );
    expect(floorFontSizes(".a{font:400 clamp(66px,8.5vw,126px)/1.12 var(--x)}")).toBe(
      ".a{font:400 max(11px,clamp(66px,8.5vw,126px))/1.12 var(--x)}",
    );
  });

  it("не трогает ноль, ключевые слова и чужие свойства", () => {
    for (const css of [
      ".a{font-size:0}",
      ".a{font-size:inherit}",
      ".a{font:inherit}",
      ".a{font-size:initial}",
      ".a{--card-font-size:3px;font-size-adjust:.5}",
    ]) {
      expect(floorFontSizes(css)).toBe(css);
    }
  });
});
