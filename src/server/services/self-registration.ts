/**
 * Правила самозаписи по общей ссылке (`/i/{slug}/join`).
 *
 * Самое тонкое место — «это тот же гость или новый?». Телефон помнит, кто
 * с него уже отвечал (гостевая сессия). Но одним телефоном часто пользуется
 * пара или вся семья: жена ответила по своей именной ссылке, а потом муж
 * открыл общую и вписал себя. Если верить одной сессии, ответ мужа ляжет
 * поверх ответа жены и переименует её. Поэтому того же гостя узнаём по
 * сессии **и** имени: совпало имя или одно — уменьшительное от другого
 * («Маша» и «Мария Иванова») — это он; иначе — новый человек.
 */
import { normalizeName } from "@/lib/name-normalize";
import { expandGuestName } from "@/server/services/diminutives";
import { makeT, type Lang } from "@/lib/i18n";

/** Сколько гостей может добавиться сам на одно мероприятие. */
export const SELF_REGISTRATION_CAP = 1500;

function firstName(name: string): string {
  return normalizeName(name).split(" ").find(Boolean) ?? "";
}

/** Варианты имени: само имя, его уменьшительные и полные формы. */
function nameForms(first: string): Set<string> {
  return new Set([first, ...expandGuestName(first)]);
}

/**
 * Тот же ли это человек: имена совпадают или одно — форма другого.
 * «Александр» и «Александра» — разные люди, хотя оба «Саши».
 */
export function samePerson(known: string, typed: string): boolean {
  const a = firstName(known);
  const b = firstName(typed);
  if (!a || !b) return false;
  if (a === b) return true;
  return nameForms(a).has(b) || nameForms(b).has(a);
}

/**
 * Имя, которое можно завести гостем. Ссылки и адреса в имени — почти
 * всегда спам в общей ссылке, выложенной в открытый чат.
 */
export function selfRegistrationNameProblem(name: string, lang: Lang = "ru"): string | null {
  const t = makeT(lang);
  const clean = name.trim();
  if (!clean) return t("Напишите, пожалуйста, своё имя — так пара поймёт, кто ответил.", "Please enter your name so the couple knows who replied.");
  if (!/\p{L}/u.test(clean)) return t("Напишите имя буквами.", "Please write your name in letters.");
  if (/https?:|www\.|\.(?:ru|com|net|org|io|me)\b|@|t\.me\//i.test(clean)) return t("В имени не должно быть ссылок и адресов.", "Your name can’t include links or addresses.");
  return null;
}
