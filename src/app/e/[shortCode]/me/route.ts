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

export const dynamic = "force-dynamic";

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function backLink(code: string, text = "Искать заново") {
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
  if (!photos && !wishes) return "";

  const button = (next: string, label: string) => `
<form method="post" action="/api/e/${code}/claim" style="display:inline">
  <input type="hidden" name="guestId" value="${esc(guestId)}"/>
  <input type="hidden" name="next" value="${next}"/>
  <button class="claim">${label}</button>
</form>`;

  return `<div class="claims">
${photos ? button("photos", "Загрузить фото") : ""}
${wishes ? button("wish", "Написать пожелание") : ""}
</div>`;
}

function seatPage(
  code: string,
  eventTitle: string,
  displayName: string,
  tableLabel: string | null,
  claims = "",
) {
  const card = tableLabel
    ? `<p class="sub" style="margin:0">Ваше место</p>
       <p class="table-label">${esc(tableLabel)}</p>`
    : `<p class="sub" style="margin:0">Место пока не назначено</p>
       <p style="margin:.5rem 0 0">Подойдите к координатору — он подскажет, куда сесть.</p>`;

  return page({
    title: displayName,
    body: `<p class="eyebrow">${esc(eventTitle)}</p>
<h1>${esc(displayName)}</h1>
<div class="result">${card}</div>
${claims}
<p class="hint">Страница сохранена в телефоне и откроется, даже если связь пропадёт.</p>
${backLink(code, "Это не я, искать заново")}`,
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
      message(code, "Слишком много попыток", "Подождите минуту и попробуйте снова.", event.title),
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  if (g) {
    const guest = await db.guest.findFirst({
      where: { id: g, eventId: event.id, archivedAt: null },
      select: {
        displayName: true,
        seat: { select: { table: { select: { label: true } } } },
      },
    });
    if (!guest) {
      return html(message(code, "Не нашли вас в списке", "Попробуйте поискать ещё раз.", event.title), {
        status: 404,
      });
    }
    return html(
      seatPage(
        code,
        event.title,
        guest.displayName,
        guest.seat?.table.label ?? null,
        claimForms(code, g, event.photosEnabled, event.wishesEnabled),
      ),
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
    return html(message(code, "Слишком короткий запрос", "Введите хотя бы две буквы имени или фамилии.", event.title));
  }

  if (result.status === "too_many") {
    return html(message(code, "Слишком много совпадений", "Добавьте фамилию — так найдём точнее.", event.title));
  }

  if (result.status === "not_found") {
    return html(
      message(
        code,
        "Не нашли вас в списке",
        "Попробуйте ввести только фамилию. Если и так не находит — подойдите к координатору, он найдёт вас вручную.",
        event.title,
      ),
    );
  }

  if (result.matches.length === 1) {
    const m = result.matches[0];
    return html(seatPage(code, event.title, m.displayName, m.tableLabel), {
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
    page({
      title: "Кто из них вы?",
      body: `<p class="eyebrow">${esc(event.title)}</p><h1>Кто из них вы?</h1>
<ul class="matches">${items}</ul>${backLink(code)}`,
    }),
  );
}
