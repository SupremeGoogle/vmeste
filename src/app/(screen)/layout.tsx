/**
 * Экран в зале. Свой root layout: здесь всё чёрное и во весь экран, и
 * ничего общего ни с панелью, ни с приглашением.
 */
import type { Metadata } from "next";
import "./screen.css";

export const metadata: Metadata = {
  title: "Экран",
  robots: { index: false, follow: false },
};

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-black text-white antialiased">{children}</body>
    </html>
  );
}
