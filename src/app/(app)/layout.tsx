/**
 * Панель организатора. Свой root layout — гостевая группа живёт отдельно
 * и не должна тащить сюда ничего, и наоборот (PLAN.md §6).
 */
import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { MotionRoot } from "@/components/motion/motion";
import Script from "next/script";
import { rybbitScriptProps } from "@/server/analytics/rybbit";
import { VISIT_BEACON } from "@/lib/visit-beacon";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { CookieNotice } from "@/components/cookie-notice";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Вместе — панель организатора", template: "%s — Вместе" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", locale: "ru_RU", siteName: SITE_NAME },
  // Коды подтверждения Search Console и Яндекс.Вебмастера — из окружения:
  // меняются без правки кода, а пустые не выводятся вовсе.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.YANDEX_VERIFICATION || undefined,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Посещения лендинга и панели — в Rybbit (без cookie, баннер не нужен).
  const rybbit = rybbitScriptProps();
  return (
    // `data-theme` ставит скрипт до гидратации — отсюда и предупреждение,
    // которое React иначе выдал бы о расхождении атрибутов.
    <html lang="ru" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <MotionRoot>{children}</MotionRoot>
        <CookieNotice />
        {/* Новый посетитель — уведомление владельцу в Telegram (api/visit). */}
        {/* Без условия: страница может собираться заранее, без переменных бота;
            без бота сервер отметку просто не пересылает. */}
        <Script id="visit-beacon" strategy="afterInteractive">{VISIT_BEACON}</Script>
        {rybbit && <Script src={rybbit.src} data-site-id={rybbit.siteId} data-mask-patterns={rybbit.mask} data-skip-patterns={rybbit.skip} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
