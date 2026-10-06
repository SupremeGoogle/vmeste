/**
 * Тема панели: светлая, тёмная или «как в системе».
 *
 * Выбор хранится в localStorage, а не в cookie: иначе корневой layout
 * читал бы cookie и лендинг перестал бы быть статическим ради одной
 * настройки. Цена — тему надо поставить скриптом в <head> до первой
 * отрисовки, иначе тёмная панель на секунду вспыхивала бы белым.
 */
export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "vmeste-theme";

/** Ставит `data-theme` на <html> и следит за системной настройкой. */
export const THEME_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_KEY)},m=window.matchMedia('(prefers-color-scheme: dark)');
function apply(){var c=localStorage.getItem(k);
document.documentElement.dataset.theme=c==='dark'||(c!=='light'&&m.matches)?'dark':'light';}
apply();m.addEventListener('change',apply);window.addEventListener('storage',apply);
window.__applyTheme=apply;
}catch(e){}})();`;

const CHANGED = "vmeste-theme-change";

/** Подписка на смену темы: в этой вкладке и в соседних (событие storage). */
export function subscribeTheme(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readThemeChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function saveThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Приватный режим без хранилища: тема применится до перезагрузки.
  }
  const apply = (window as { __applyTheme?: () => void }).__applyTheme;
  if (apply) apply();
  else document.documentElement.dataset.theme = choice === "dark" ? "dark" : "light";
  window.dispatchEvent(new Event(CHANGED));
}
