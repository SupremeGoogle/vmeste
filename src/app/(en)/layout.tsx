/**
 * Английская версия титульной (/en). Свой root layout ради `<html lang="en">`:
 * у панели организатора язык зашит в её корневом layout.
 */
import type { Metadata } from "next";
import "../(app)/globals.css";
import { ThemeScript } from "@/components/theme-script";
import { MotionRoot } from "@/components/motion/motion";
import Script from "next/script";
import { rybbitScriptProps } from "@/server/analytics/rybbit";
import { VISIT_BEACON } from "@/lib/visit-beacon";
import { SITE_URL } from "@/lib/site";
import { CookieNotice } from "@/components/cookie-notice";
import { Metrika } from "@/components/metrika";
import { EN_DESCRIPTION, EN_NAME } from "../(app)/_landing/landing-page";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: EN_NAME, template: "%s — Vmeste" },
  description: EN_DESCRIPTION,
  applicationName: EN_NAME,
  openGraph: { type: "website", locale: "en_US", siteName: EN_NAME },
};

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  const rybbit = rybbitScriptProps();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <MotionRoot>{children}</MotionRoot>
        <CookieNotice lang="en" />
        <Metrika />
        <Script id="visit-beacon" strategy="afterInteractive">{VISIT_BEACON}</Script>
        {rybbit && <Script src={rybbit.src} data-site-id={rybbit.siteId} data-mask-patterns={rybbit.mask} data-skip-patterns={rybbit.skip} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
