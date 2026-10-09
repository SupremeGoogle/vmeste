/**
 * Язык кабинета на сервере — выбор организатора из cookie `vm_lang`
 * (его ставит переключатель RU/EN). Нет выбора — русский.
 */
import { cookies } from "next/headers";
import { LANG_COOKIE, makeT, parseLang, type Lang, type T } from "@/lib/i18n";

export async function getUiLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value) ?? "ru";
}

/** `const t = await getT(); t("Гости", "Guests")` — для серверных компонентов и действий. */
export async function getT(): Promise<T> {
  return makeT(await getUiLang());
}
