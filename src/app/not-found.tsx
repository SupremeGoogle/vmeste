import { COLORS, FONTS } from "@/server/guest-html/theme";

/**
 * Страница «не найдено» для случаев, когда её просит сам код —
 * `notFound()` в маршрутах панели и экрана.
 *
 * Лежит в корне `app/`, а не в сегментах: у приложения три корневых
 * макета (панель, гость, экран), и Next в такой раскладке не подхватывает
 * `not-found.tsx` из групп — проверено на собранном приложении.
 */
export default function NotFound() {
  return (
    <div
      style={{
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
    </div>
  );
}
