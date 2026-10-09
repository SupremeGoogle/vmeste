"use client";

/**
 * Язык кабинета для клиентских компонентов: провайдер ставит layout
 * кабинета, компоненты берут `const t = useT()` и пишут `t("Гости", "Guests")`.
 * Без провайдера — русский (так компоненты работают и вне кабинета).
 */
import { createContext, useContext, useMemo } from "react";
import { makeT, type Lang, type T } from "@/lib/i18n";

const LangContext = createContext<Lang>("ru");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): T {
  const lang = useContext(LangContext);
  return useMemo(() => makeT(lang), [lang]);
}
