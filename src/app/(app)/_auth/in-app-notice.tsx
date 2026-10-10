"use client";

/**
 * Подсказка на входе и регистрации, когда сайт открыт внутри Instagram,
 * VK, TikTok и т. п.: Google там не пускает, а кнопка вела в тупик
 * «403 disallowed_useragent». Предлагаем открыть страницу в браузере
 * или пройти по почте — код из письма работает и во встроенном браузере.
 *
 * Цвета — только токены темы (amber-50/100/900, stone, card): у страниц
 * входа есть тёмная тема, и прочие оттенки amber там нечитаемы.
 */
import { useState } from "react";
import type { InAppBrowser } from "@/lib/in-app-browser";

const TEXT = {
  ru: {
    title: (app: string | null) => (app ? `Сайт открыт внутри ${app}` : "Сайт открыт во встроенном браузере"),
    body: (action: string) => `Google не даёт входить из встроенных браузеров приложений. ${action} — или продолжите по почте ниже: код из письма работает и здесь.`,
    action: { ios: "Откройте страницу в Safari", android: "Откройте страницу в Chrome", other: "Откройте страницу в браузере" },
    open: { ios: "Открыть в Safari", android: "Открыть в Chrome", other: "Открыть в браузере" },
    menu: "Если кнопка не сработала: меню ⋯ в углу экрана → «Открыть в браузере».",
    copy: "Скопировать ссылку",
    copied: "Ссылка скопирована",
  },
  en: {
    title: (app: string | null) => (app ? `You’re browsing inside ${app}` : "You’re in an in-app browser"),
    body: (action: string) => `Google doesn’t allow signing in from in-app browsers. ${action}, or continue with email below — the emailed code works here too.`,
    action: { ios: "Open this page in Safari", android: "Open this page in Chrome", other: "Open this page in your browser" },
    open: { ios: "Open in Safari", android: "Open in Chrome", other: "Open in browser" },
    menu: "If the button doesn’t work: tap the ⋯ menu in the corner → “Open in browser”.",
    copy: "Copy link",
    copied: "Link copied",
  },
};

export function InAppNotice({
  browser,
  url,
  openHref,
  lang,
}: {
  browser: InAppBrowser;
  url: string;
  openHref: string | null;
  lang: "ru" | "en";
}) {
  const [copied, setCopied] = useState(false);
  const t = TEXT[lang];

  return (
    <div role="note" className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <p className="font-medium">{t.title(browser.app)}</p>
      <p className="mt-1.5 leading-relaxed">{t.body(t.action[browser.os])}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {openHref && (
          <a href={openHref} className="rounded-lg bg-stone-900 px-4 py-2 text-white" data-rybbit-event="inapp_open_browser">
            {t.open[browser.os]}
          </a>
        )}
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-card px-4 py-2 text-stone-800"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            } catch {
              // Буфер обмена во WebView бывает закрыт — покажем адрес, его можно выделить.
              window.prompt(t.copy, url);
            }
          }}
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed opacity-80">{t.menu}</p>
    </div>
  );
}
