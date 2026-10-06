"use client";

/**
 * Последний рубеж: ошибка, уронившая сам layout. Отправляем её в Sentry и
 * показываем человеку спокойную страницу с кнопкой «Попробовать снова».
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf8f5", color: "#2b2622", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 28 }}>Что-то пошло не так</h1>
          <p style={{ color: "#6b625a", lineHeight: 1.5 }}>Мы уже знаем об ошибке и разбираемся. Попробуйте ещё раз через минуту.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, border: "1px solid #2b2622", background: "#2b2622", color: "#fff", cursor: "pointer" }}>
            Попробовать снова
          </button>
          {error.digest && <p style={{ marginTop: 24, fontSize: 12, color: "#9b928a" }}>Код ошибки: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
