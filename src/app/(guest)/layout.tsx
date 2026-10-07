/**
 * Страница гостя. Свой root layout: с панелью организатора у неё общего
 * только стиль, а тащить сюда её скрипты и стили незачем.
 */
import type { Metadata, Viewport } from "next";
import "./guest.css";
import Script from "next/script";
import { MotionRoot } from "@/components/motion/motion";
import { VISIT_BEACON } from "@/lib/visit-beacon";

export const metadata: Metadata = {
  title: "Свадьба",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f2",
};

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh font-sans text-ink antialiased">
        <div className="guest-aurora" aria-hidden />
        <MotionRoot>{children}</MotionRoot>
        {/* Новый посетитель — уведомление владельцу в Telegram (api/visit). */}
        <Script id="visit-beacon" strategy="afterInteractive">{VISIT_BEACON}</Script>
      </body>
    </html>
  );
}
