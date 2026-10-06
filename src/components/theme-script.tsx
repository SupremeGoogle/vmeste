"use client";

/**
 * Скрипт темы в <head>.
 *
 * Клиентский компонент ради двух случаев, когда React пересобирает корневой
 * layout в браузере (Fast Refresh, восстановление после ошибки):
 *   — созданный заново <script> браузер не исполняет, а React ругается
 *     «Encountered a script tag». В браузере отдаём его как блок данных
 *     (`type="application/json"`) — на это React не ругается, а исполнять
 *     нечего: тема к этому моменту уже стоит. Сервер отдаёт настоящий скрипт,
 *     он и срабатывает до первой отрисовки;
 *   — пересобирая <html>, React снимает атрибуты, которых нет в его props,
 *     в том числе `data-theme`. Эффект возвращает тему до отрисовки кадра.
 */
import { useLayoutEffect } from "react";
import { THEME_SCRIPT } from "@/lib/theme";

export function ThemeScript() {
  useLayoutEffect(() => {
    (window as { __applyTheme?: () => void }).__applyTheme?.();
  }, []);

  return (
    <script
      // На сервере — исполняемый скрипт, в браузере — инертный блок.
      // Расхождение атрибута при гидратации ожидаемо и заглушено.
      type={typeof window === "undefined" ? undefined : "application/json"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
