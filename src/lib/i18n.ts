/**
 * Язык сайта: русский по умолчанию, английский — на /en.
 *
 * Выбор посетителя хранится в cookie `vm_lang` (её читают страницы входа
 * и регистрации на сервере) и в localStorage — для скриптов лендинга.
 *
 * Автоопределение языка — только в браузере: nginx кеширует «/» для
 * анонимных посетителей, и переадресация по Accept-Language на сервере
 * отдала бы всем закешированный ответ первого посетителя.
 */
export type Lang = "ru" | "en";

export const LANG_COOKIE = "vm_lang";
export const LANG_MAX_AGE = 60 * 60 * 24 * 365;

export function parseLang(value: string | null | undefined): Lang | null {
  return value === "ru" || value === "en" ? value : null;
}

/** hreflang-пары лендинга: для metadata.alternates.languages. */
export const LANDING_LANGUAGES = { ru: "/", en: "/en", "x-default": "/" };

const BOT = "/bot|crawl|spider|slurp|yandex|google|bing|lighthouse|headless|preview/i";

/** Сохранённый выбор: сначала localStorage, затем cookie. */
const STORED = `var s=null;try{s=localStorage.getItem("${LANG_COOKIE}")}catch(e){}if(s!=="ru"&&s!=="en"){var m=document.cookie.match(/(?:^|; )${LANG_COOKIE}=(ru|en)(?:;|$)/);s=m?m[1]:null}`;

/**
 * Для «/»: выбран английский — или выбора нет, а основной язык браузера
 * не из русскоязычных регионов, — уходим на /en. Роботов не трогаем.
 */
export const RU_LANDING_SCRIPT = `(function(){try{if(${BOT}.test(navigator.userAgent))return;${STORED}if(s==="ru")return;if(s!=="en"){var l=String((navigator.languages&&navigator.languages[0])||navigator.language||"").toLowerCase();if(!l||["ru","uk","be","kk","uz","tg","ky","hy","az","ka"].indexOf(l.split(/[-_]/)[0])>=0)return}location.replace("/en"+location.search+location.hash)}catch(e){}})()`;

/** Для «/en»: посетитель сам выбрал русский — возвращаем на «/». */
export const EN_LANDING_SCRIPT = `(function(){try{if(${BOT}.test(navigator.userAgent))return;${STORED}if(s==="ru")location.replace("/"+location.search+location.hash)}catch(e){}})()`;

/** Запомнить выбор в cookie и localStorage (только в браузере). */
export function rememberLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_COOKIE, lang);
  } catch {
    // Хранилище закрыто (приватный режим) — хватит и cookie.
  }
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${LANG_MAX_AGE}; SameSite=Lax`;
}

/**
 * Перевод «на месте»: `t("Гости", "Guests")`. Пары строк живут рядом с
 * разметкой, а не в общем словаре — так кабинет переводится по частям,
 * без одного огромного файла, который правят все сразу.
 */
export type T = (ru: string, en: string) => string;

export function makeT(lang: Lang): T {
  return (ru, en) => (lang === "en" ? en : ru);
}

/**
 * Число со словом на обоих языках:
 * `countWord(lang, 5, ["гость", "гостя", "гостей"], ["guest", "guests"])` → «5 гостей» / «5 guests».
 */
export function countWord(lang: Lang, n: number, ru: [string, string, string], en: [string, string]): string {
  if (lang === "en") return `${n} ${n === 1 ? en[0] : en[1]}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? ru[0] : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? ru[1] : ru[2];
  return `${n} ${word}`;
}

/** Локаль для Intl (даты, числа). */
export function localeOf(lang: Lang): "ru-RU" | "en-US" {
  return lang === "en" ? "en-US" : "ru-RU";
}
