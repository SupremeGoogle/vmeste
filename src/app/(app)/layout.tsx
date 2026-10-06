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

export const metadata: Metadata = {
  title: "Вместе — панель организатора",
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
        {rybbit && <Script src={rybbit.src} data-site-id={rybbit.siteId} data-mask-patterns={rybbit.mask} data-skip-patterns={rybbit.skip} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
