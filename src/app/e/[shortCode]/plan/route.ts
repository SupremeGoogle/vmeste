/**
 * Общий план зала для гостя (PLAN.md §2.1).
 *
 * Открывается с той же QR-страницы, что и поиск по имени: «где мой стол»
 * словами и «вон там» на плане — это два разных вопроса, и второй задают,
 * уже стоя в дверях.
 *
 * Страница статична и кешируется: рассадка в день свадьбы почти не
 * меняется, а зайти на неё могут сразу полсотни человек.
 * `?t=<tableId>` подсвечивает нужный стол — ссылка приходит со страницы
 * «ваше место».
 */
import { db } from "@/server/db";
import { findEventByShortCode } from "@/server/repositories/events";
import { esc, html, page } from "@/server/guest-html/layout";
import { floorPlanSvg } from "@/server/guest-html/floor-plan-svg";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  // Архивные сюда не приходят: их отсекает сам поиск по коду.
  if (!event) {
    return html(page({ title: "Не найдено", body: "<h1>Мероприятие не найдено</h1>" }), {
      status: 404,
    });
  }

  const highlight = new URL(request.url).searchParams.get("t");

  const tables = await db.seatTable.findMany({
    where: { eventId: event.id },
    orderBy: { label: "asc" },
    select: {
      id: true, label: true, shape: true, x: true, y: true,
      width: true, height: true, capacity: true,
      _count: { select: { seats: { where: { guestId: { not: null } } } } },
    },
  });

  if (tables.length === 0) {
    return html(
      page({
        title: "План зала",
        body: `<p class="eyebrow">${esc(event.title)}</p><h1>План зала</h1>
<p class="sub">Рассадка ещё готовится. Подойдите к координатору.</p>
<p class="hint"><a href="/e/${shortCode}">Найти свой стол по имени</a></p>`,
      }),
      { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=86400" } },
    );
  }

  const svg = floorPlanSvg(
    tables.map((table) => ({
      id: table.id,
      label: table.label,
      shape: table.shape,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      capacity: table.capacity,
      taken: table._count.seats,
    })),
    highlight,
  );

  const highlighted = highlight ? tables.find((table) => table.id === highlight) : null;

  return html(
    page({
      title: `План зала — ${event.title}`,
      body: `<p class="eyebrow">${esc(event.title)}</p>
<h1>План зала</h1>
${highlighted ? `<p class="sub">Ваш стол — <b>${esc(highlighted.label)}</b>, он закрашен на плане.</p>` : `<p class="sub">Найдите свой стол по названию.</p>`}
${svg}
<p class="hint"><a href="/e/${shortCode}">Искать себя по имени</a></p>`,
    }),
    {
      headers: {
        // Тот же расчёт, что и на входе: пусть живёт в кеше браузера и CDN,
        // а при упавшем бэкенде отдаётся сутки (PLAN.md §2.5).
        "cache-control": "public, max-age=60, stale-while-revalidate=86400",
      },
    },
  );
}
