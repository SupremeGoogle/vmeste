import { COLORS, FONTS } from "@/server/guest-html/theme";

/**
 * Страница «не найдено» для несуществующих адресов.
 *
 * Пара к `app/not-found.tsx`: та показывается, когда 404 просит сам код
 * (`notFound()` в панели и на экране), эта — когда адрес не совпал ни
 * с одним маршрутом. Next разделяет эти два случая, поэтому разметка
 * дублируется: у глобальной свои `<html>` и `<body>`, потому что
 * корневого макета у неё нет.
 *
 * До неё доходят по трём разным дорогам: гость с опечаткой в ссылке,
 * организатор с чужим мероприятием и координатор, скопировавший ссылку
 * на экран не целиком. Стандартное английское «This page could not be
 * found» в любой из них выглядит как поломка сервиса, а на проекторе
 * в тёмном зале — ещё и вспышкой на всю стену.
 *
 * Формулировка обтекаемая намеренно: существование чужого мероприятия —
 * тоже сведения, и отличать «нет такого» от «есть, но не ваше» здесь
 * незачем (PLAN.md §1.2).
 *
 * Своя разметка целиком, без общих layout: у приложения три корневых
 * макета (панель, гость, экран), и ни один из них этой странице не подходит.
 */
export const metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: COLORS.bg,
          color: COLORS.ink,
          fontFamily: FONTS.serif,
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: COLORS.muted,
            fontFamily: FONTS.sans,
          }}
        >
          Вместе
        </p>
        <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 500 }}>Страница не найдена</h1>
        <div style={{ width: "3rem", height: 1, background: COLORS.line }} />
        <p style={{ margin: 0, maxWidth: "26rem", color: COLORS.muted, lineHeight: 1.6 }}>
          Возможно, ссылку скопировали не целиком, мероприятие убрали в архив
          или оно из другого агентства.
        </p>
      </body>
    </html>
  );
}
