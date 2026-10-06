"use client";

/**
 * Переключатель темы в шапке панели: авто → светлая → тёмная.
 *
 * Одна кнопка, а не три: шапка на телефоне и так тесная. Подпись у
 * кнопки говорит, что включено сейчас, а не что включится, — так
 * читают переключатели и в системных настройках.
 */
import { useSyncExternalStore } from "react";
import { readThemeChoice, saveThemeChoice, subscribeTheme, type ThemeChoice } from "@/lib/theme";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeChoice, string> = {
  system: "Тема: как в системе",
  light: "Тема: светлая",
  dark: "Тема: тёмная",
};

export function ThemeToggle() {
  // Выбор живёт в localStorage. На сервере его нет — там «авто», чтобы
  // разметка совпала, а после гидратации React сам подставит настоящий.
  const choice = useSyncExternalStore(subscribeTheme, readThemeChoice, () => "system" as ThemeChoice);

  function toggle() {
    saveThemeChoice(NEXT[choice]);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={LABEL[choice]}
      aria-label={`${LABEL[choice]}. Нажмите, чтобы сменить`}
      className="grid size-8 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {choice === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : choice === "dark" ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
