/**
 * Результат поиска: «Ваш стол». Одна страница на три состояния —
 * каждый лишний переход это секунды в очереди на входе.
 *
 *   ?q=Петрова — поиск; при единственном совпадении сразу показываем стол
 *   ?g=<id>    — гость выбран из списка совпадений
 *   без обоих  — возврат на форму
 */
import { createHash } from "node:crypto";
import { db } from "@/server/db";
import { findEventByShortCode } from "@/server/repositories/events";
import { searchGuests } from "@/server/services/guest-search";
import { rateLimit } from "@/server/rate-limit";
import { clientAddress, lookupKeys, WINDOW_MS } from "@/server/rate-limit/client-key";
import { esc, html, page } from "@/server/guest-html/layout";
import { gl, withGuestLang } from "@/server/guest-html/guest-lang";

export const dynamic = "force-dynamic";

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function backLink(code: string, text = gl("Искать заново", "Search again")) {
  return `<p class="hint"><a href="/e/${code}">${text}</a></p>`;
}

function message(code: string, title: string, sub: string, eventTitle: string) {
  return page({
    title,
    body: `<p class="eyebrow">${esc(eventTitle)}</p><h1>${esc(title)}</h1>
<p class="sub">${sub}</p>${backLink(code)}`,
  });
}

/** Запоминаем стол в телефоне: гость, потерявший связь после входа,
 *  всё равно увидит подсказку на форме (PLAN.md §5.1). */
function rememberScript(displayName: string, tableLabel: string | null) {
  const payload = JSON.stringify({ n: displayName, t: tableLabel });
  return `(function(){try{var c=location.pathname.split('/')[2];
localStorage.setItem('vmeste_seat_'+c,${JSON.stringify(payload)})}catch(e){}
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}})();`;
}

/**
 * Кнопки «это я» ведут на выдачу гостевой cookie (PLAN.md §1.3): дальше
 * гость может загрузить фото и написать пожелание, не вводя имя заново.
 * Обычные формы — на этой странице JavaScript по-прежнему не нужен.
 */
function claimForms(code: string, guestId: string, photos: boolean, wishes: boolean) {

  const button = (next: string, label: string, primary = false) => `
<form method="post" action="/api/e/${code}/claim" style="display:inline">
  <input type="hidden" name="guestId" value="${esc(guestId)}"/>
  <input type="hidden" name="next" value="${next}"/>
  <button class="claim"${primary ? ' style="font-weight:600"' : ""}>${label}</button>
</form>`;

  return `<div class="claims">
${button("hub", gl("Моя страница: стол, фото и рассадка", "My page: table, photos and seating"), true)}
${photos ? button("photos", gl("Загрузить фото", "Upload photos")) : ""}
${wishes ? button("wish", gl("Написать пожелание", "Write a wish")) : ""}
</div>`;
}

function seatPage(
  code: string,
  eventTitle: string,
  displayName: string,
  tableLabel: string | null,
  claims = "",
  tableId: string | null = null,
) {
  const card = tableLabel
    ? `<p class="sub" style="margin:0">${gl("Ваше место", "Your table")}</p>
       <p class="table-label">${esc(tableLabel)}</p>`
    : `<p class="sub" style="margin:0">${gl("Место пока не назначено", "No seat assigned yet")}</p>
       <p style="margin:.5rem 0 0">${gl("Подойдите к координатору — он подскажет, куда сесть.", "Please ask the coordinator where to sit.")}</p>`;

  return page({
    title: displayName,
    body: `<p class="eyebrow">${esc(eventTitle)}</p>
<h1>${esc(displayName)}</h1>
<div class="result">${card}</div>
${tableId ? `<p class="hint"><a href="/e/${code}/plan?t=${tableId}">${gl("Показать на плане зала", "Show on the floor plan")}</a></p>` : ""}
${claims}
<p class="hint">${gl("Страница сохранена в телефоне и откроется, даже если связь пропадёт.", "This page is saved on your phone and will open even without a connection.")}</p>
${backLink(code, gl("Это не я, искать заново", "Not me, search again"))}`,
    script: rememberScript(displayName, tableLabel),
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const code = esc(shortCode.slice(0, 12));
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const g = url.searchParams.get("g");

  if (!q && !g) return Response.redirect(new URL(`/e/${shortCode}`, req.url), 303);

  const event = await findEventByShortCode(shortCode);
  if (!event) {
    // Неверный код и ненайденное имя выглядят одинаково: по разнице ответов
    // можно было бы перебирать существующие коды мероприятий.
    return html(
      message(code, "Не нашли вас в списке", "Проверьте код на приглашении или подойдите к координатору.", "Свадьба"),
      { status: 404 },
    );
  }

  // Всё, что ниже рисуется, — на языке мероприятия.
  const inLang = (render: () => string) => withGuestLang(event.language, render);
  const ip = clientAddress(req);
  // Два потолка: по клиенту и по мероприятию целиком. Подробности и цифры —
  // в client-key.ts, они выведены из нагрузочной проверки, а не из головы.
  const keys = lookupKeys(req, event.id);
  const limited = [
    rateLimit(keys.client.key, keys.client.limit, WINDOW_MS),
    rateLimit(keys.event.key, keys.event.limit, WINDOW_MS),
  ].find((r) => !r.ok) ?? { ok: true as const };

  if (!limited.ok) {
    return html(
      inLang(() => message(code, gl("Слишком много попыток", "Too many attempts"), gl("Подождите минуту и попробуйте снова.", "Please wait a minute and try again."), event.title)),
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  if (g) {
    const guest = await db.guest.findFirst({
      where: { id: g, eventId: event.id, archivedAt: null },
      select: {
        displayName: true,
        seat: { select: { table: { select: { id: true, label: true } } } },
      },
    });
    if (!guest) {
      return html(inLang(() => message(code, gl("Не нашли вас в списке", "We couldn’t find you on the list"), gl("Попробуйте поискать ещё раз.", "Please try searching again."), event.title)), {
        status: 404,
      });
    }
    return html(
      inLang(() => seatPage(
        code,
        event.title,
        guest.displayName,
        guest.seat?.table.label ?? null,
        claimForms(code, g, event.photosEnabled, event.wishesEnabled),
        guest.seat?.table.id ?? null,
      )),
      // Приватный кеш и ненадолго: страница именная, а на ней теперь ещё
      // и кнопки, выдающие гостевую сессию.
      { headers: { "cache-control": "private, max-age=60" } },
    );
  }

  const result = await searchGuests(event.id, q!);

  db.guestActionLog
    .create({
      data: {
        orgId: event.orgId,
        eventId: event.id,
        action: "checkin_lookup",
        detail: `${result.status}: ${q!.slice(0, 60)}`,
        ipHash: hashIp(ip),
        ua: req.headers.get("user-agent")?.slice(0, 200) ?? null,
      },
    })
    // Журнал не должен ронять вход в зал.
    .catch(() => {});

  if (result.status === "too_short") {
    return html(inLang(() => message(code, gl("Слишком короткий запрос", "Search is too short"), gl("Введите хотя бы две буквы имени или фамилии.", "Enter at least two letters of your first or last name."), event.title)));
  }

  if (result.status === "too_many") {
    return html(inLang(() => message(code, gl("Слишком много совпадений", "Too many matches"), gl("Добавьте фамилию — так найдём точнее.", "Add your last name to narrow it down."), event.title)));
  }

  if (result.status === "not_found") {
    return html(
      inLang(() => message(
        code,
        gl("Не нашли вас в списке", "We couldn’t find you on the list"),
        gl("Попробуйте ввести только фамилию. Если и так не находит — подойдите к координатору, он найдёт вас вручную.", "Try entering just your last name. If that doesn’t work, the coordinator can find you."),
        event.title,
      )),
    );
  }

  if (result.matches.length === 1) {
    const m = result.matches[0];
    return html(inLang(() => seatPage(code, event.title, m.displayName, m.tableLabel, claimForms(code, m.guestId, event.photosEnabled, event.wishesEnabled))), {
      headers: { "cache-control": "private, max-age=300" },
    });
  }

  const items = result.matches
    .map(
      (m) =>
        `<li><a href="/e/${code}/me?g=${encodeURIComponent(m.guestId)}">${esc(m.displayName)}</a></li>`,
    )
    .join("");

  return html(
    inLang(() => page({
      title: gl("Кто из них вы?", "Which one is you?"),
      body: `<p class="eyebrow">${esc(event.title)}</p><h1>${gl("Кто из них вы?", "Which one is you?")}</h1>
<ul class="matches">${items}</ul>${backLink(code)}`,
    })),
  );
}
