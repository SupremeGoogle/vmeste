/**
 * Ботанический фон первого экрана.
 *
 * Те же пионы и эвкалипт, что в приглашениях (`guest-html/botanical.ts`),
 * — один продукт должен выглядеть одним продуктом: человек, увидевший
 * букет на титульной, узнаёт его в своём приглашении.
 *
 * Разметка вставляется строкой, потому что рисуется она серверной
 * функцией, общей с гостевыми страницами. Переписывать те же двести
 * лепестков вторым компонентом на React значило бы завести вторую
 * ботанику, которая разойдётся с первой на второй же правке.
 *
 * Содержимое строки — наше собственное, из констант в коде; ни одного
 * пользовательского символа сюда не попадает.
 */
import { floralCorner } from "@/server/guest-html/botanical";

const COLORS = {
  petal: "#fffdf9",
  petalShade: "#e8dccd",
  leaf: "#b3bea0",
  accent: "#c9ab7e",
};

export function BotanicalBackdrop() {
  const art = floralCorner(COLORS);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Композиция определена один раз, по углам — ссылки на неё. */}
      <svg width="0" height="0" className="absolute">
        <symbol id="landing-floral" viewBox="0 0 200 200" dangerouslySetInnerHTML={{ __html: art }} />
      </svg>

      {/* Приглушены сильнее, чем в приглашении: здесь под ними лежит
          заголовок, а не поля листа. */}
      <svg viewBox="0 0 200 200" className="absolute -top-8 -left-10 w-56 opacity-45 sm:w-72 lg:w-96">
        <use href="#landing-floral" />
      </svg>
      <svg
        viewBox="0 0 200 200"
        className="absolute -right-10 -bottom-10 w-48 rotate-180 opacity-35 sm:w-64 lg:w-80"
      >
        <use href="#landing-floral" />
      </svg>
    </div>
  );
}
