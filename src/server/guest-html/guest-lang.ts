/**
 * Язык гостевой части (приглашение, анкета, страница гостя) — язык
 * мероприятия (`Event.language`), а не браузера гостя: пара пишет тексты
 * на своём языке, и служебные надписи вокруг них должны совпадать.
 *
 * Рендер гостевого HTML синхронный, поэтому язык, как и надписи шаблона
 * (`template-labels.ts`), лежит в модульной переменной на время одного
 * рендера: `withGuestLang(event.language, () => invitePage(...))`, а внутри
 * шаблона — `gl("Подтвердить", "Confirm")`. Не протягиваем параметр через
 * десятки функций каждого шаблона.
 *
 * Внутри `await` модульная переменная не переживёт чужой рендер — поэтому
 * оборачивать только синхронные вызовы.
 */
import { parseLang, type Lang } from "@/lib/i18n";

let current: Lang = "ru";

export function withGuestLang<R>(lang: string | null | undefined, render: () => R): R {
  const previous = current;
  current = parseLang(lang) ?? "ru";
  try {
    return render();
  } finally {
    current = previous;
  }
}

/** Язык текущего рендера. */
export function guestLang(): Lang {
  return current;
}

/** `gl("Подтвердить", "Confirm")` — строка на языке мероприятия. */
export function gl(ru: string, en: string): string {
  return current === "en" ? en : ru;
}
