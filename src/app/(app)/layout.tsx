/**
 * Панель организатора. Свой root layout — гостевая группа живёт отдельно
 * и не должна тащить сюда ничего, и наоборот (PLAN.md §6).
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Вместе — панель организатора",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
