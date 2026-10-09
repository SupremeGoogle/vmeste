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
import { findEventByShortCode } from "@/server/repositories/events";
import { getPublicPlan } from "@/server/repositories/seating";
import { esc, html, page } from "@/server/guest-html/layout";
import { floorPlanSvg, PLAN_SCROLL_SCRIPT } from "@/server/guest-html/floor-plan-svg";
import { gl, withGuestLang } from "@/server/guest-html/guest-lang";

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

  const { hall, tables } = await getPublicPlan(event.id);

  if (tables.length === 0) {
    return html(
      withGuestLang(event.language, () => page({
        title: gl("План зала", "Floor plan"),
        body: `<p class="eyebrow">${esc(event.title)}</p><h1>${gl("План зала", "Floor plan")}</h1>
<p class="sub">${gl("Рассадка ещё готовится. Подойдите к координатору.", "The seating chart isn’t ready yet. Please ask the coordinator.")}</p>
<p class="hint"><a href="/e/${shortCode}">${gl("Найти свой стол по имени", "Find your table by name")}</a></p>`,
      })),
      { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=86400" } },
    );
  }

  const highlighted = highlight ? tables.find((table) => table.id === highlight) : null;

  return html(
    withGuestLang(event.language, () => page({
      title: `${gl("План зала", "Floor plan")} — ${event.title}`,
      body: `<p class="eyebrow">${esc(event.title)}</p>
<h1>${gl("План зала", "Floor plan")}</h1>
${highlighted ? `<p class="sub">${gl("Ваш стол", "Your table")} — <b>${esc(highlighted.label)}</b>${gl(", он закрашен на плане.", ", highlighted on the plan.")}</p>` : `<p class="sub">${gl("Найдите свой стол по названию.", "Find your table by its name.")}</p>`}
${floorPlanSvg(tables, highlight, hall)}
<p class="hint"><a href="/e/${shortCode}">${gl("Искать себя по имени", "Search by name")}</a></p>`,
      script: PLAN_SCROLL_SCRIPT,
    })),
    {
      headers: {
        // Тот же расчёт, что и на входе: пусть живёт в кеше браузера и CDN,
        // а при упавшем бэкенде отдаётся сутки (PLAN.md §2.5).
        "cache-control": "public, max-age=60, stale-while-revalidate=86400",
      },
    },
  );
}
