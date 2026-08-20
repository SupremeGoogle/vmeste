/**
 * Гостевая группа: приглашение и всё, что открывает гость по ссылке.
 *
 * Свой root layout, отдельный от панели организатора (PLAN.md §6): у них
 * разная типографика и разные требования к весу. Вход по QR (`/e/*`) сюда
 * не входит вовсе — он отдаётся строкой HTML мимо React, потому что там
 * важна каждая килобайта (CLAUDE.md, решение 1).
 */
import type { Metadata } from "next";
import "./invite.css";

export const metadata: Metadata = {
  title: "Приглашение",
};

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
