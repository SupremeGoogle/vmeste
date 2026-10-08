"use client";

/**
 * Переключатель языка «RU | EN». Запоминает выбор (cookie + localStorage)
 * и уводит на лендинг нужного языка — или, с `stay`, перезагружает текущую
 * страницу: вход и регистрация читают cookie на сервере.
 */
import { rememberLang, type Lang } from "@/lib/i18n";

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: "ru", label: "RU", name: "Русский" },
  { lang: "en", label: "EN", name: "English" },
];

export function LangSwitch({ current, stay = false, className = "" }: { current: Lang; stay?: boolean; className?: string }) {
  const choose = (lang: Lang) => {
    rememberLang(lang);
    if (lang === current) return;
    if (stay) {
      const url = new URL(window.location.href);
      url.searchParams.delete("lang");
      window.location.replace(url.toString());
    } else {
      window.location.assign(lang === "en" ? "/en" : "/");
    }
  };

  return (
    <div
      role="group"
      aria-label={current === "en" ? "Language" : "Язык"}
      className={`lang-switch inline-flex shrink-0 items-center rounded-full border border-current/25 p-0.5 text-[12px] font-medium leading-none tracking-[0.06em] ${className}`}
    >
      {OPTIONS.map((option) => {
        const active = option.lang === current;
        return (
          <button
            key={option.lang}
            type="button"
            lang={option.lang}
            onClick={() => choose(option.lang)}
            aria-pressed={active}
            aria-label={option.name}
            title={option.name}
            className={`rounded-full px-2.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
              active ? "bg-stone-900 text-white" : "opacity-70 hover:opacity-100"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
