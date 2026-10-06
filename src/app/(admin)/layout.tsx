/**
 * Панель суперадмина — отдельный root layout: ни скриптов аналитики,
 * ни общего с панелью организатора. Поисковикам и кешам сюда нельзя.
 */
import type { Metadata } from "next";
import "../(app)/globals.css";

export const metadata: Metadata = {
  // Нейтральный заголовок: 404 для посторонних не должна выдавать, что здесь панель.
  title: "Вместе",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#f6f4f1] text-stone-900 antialiased">{children}</body>
    </html>
  );
}
