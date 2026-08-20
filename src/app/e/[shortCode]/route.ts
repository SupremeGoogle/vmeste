/**
 * Вход по QR-коду. Форма из одного поля и ничего больше.
 *
 * Пиковая нагрузка сценария — 150 гостей за 10 минут. Проблема при этом
 * не в запросах в секунду (их 0,25), а в очереди из людей: каждое лишнее
 * касание и каждая секунда ожидания множатся на 150.
 *
 * Поэтому: ни одного запроса к БД при открытии, кеш в браузере и CDN,
 * автофокус на поле, отправка обычным GET-ом.
 */
import { esc, html, page } from "@/server/guest-html/layout";

export const dynamic = "force-static";

/** Мелкое улучшение поверх работающей страницы: подсказка «в прошлый раз»
 *  и Service Worker. Если скрипт не выполнится — не изменится ничего. */
const ENHANCE = `(function(){try{var c=location.pathname.split('/')[2];
var r=localStorage.getItem('vmeste_seat_'+c);if(r){var d=JSON.parse(r);var b=document.getElementById('last');
if(d&&d.n&&b){b.innerHTML='В прошлый раз: <b>'+d.n.replace(/[<>&]/g,'')+'</b>'+(d.t?' — '+d.t.replace(/[<>&]/g,''):'');
b.hidden=false}}}catch(e){}var i=document.getElementById('q');if(i)i.focus();
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}})();`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const code = esc(shortCode.slice(0, 12));

  // Код мероприятия здесь НЕ проверяется: это запрос к БД на самой горячей
  // странице ради сообщения, которое гость всё равно увидит после ввода имени.
  const body = `
<p class="eyebrow">Свадьба</p>
<h1>Найдите свой стол</h1>
<p class="sub">Введите имя или фамилию — покажем, где вы сидите.</p>
<div class="note" id="last" hidden></div>
<form method="get" action="/e/${code}/me">
  <label for="q">Имя или фамилия</label>
  <input id="q" name="q" type="text" required minlength="2" maxlength="80"
         autocomplete="name" autocapitalize="words" enterkeyhint="search"
         placeholder="Например, Петрова">
  <button type="submit">Найти</button>
</form>
<p class="hint">Не нашли себя? Попробуйте только фамилию. Если и так нет —
подойдите к координатору, он найдёт вас в списке.</p>`;

  return html(page({ title: "Найдите свой стол", body, script: ENHANCE }), {
    headers: {
      // Часть плана Б: сутки stale-while-revalidate означают, что при упавшем
      // бэкенде браузер и CDN всё равно отдают страницу (PLAN.md §2.5).
      "cache-control": "public, max-age=60, stale-while-revalidate=86400",
    },
  });
}
