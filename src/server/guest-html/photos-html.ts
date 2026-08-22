/**
 * Страница фотографий гостя — строка HTML плюс небольшой собственный скрипт.
 *
 * Здесь JavaScript действительно нужен: браузер режет превью в canvas и
 * кладёт файлы прямо в хранилище (PLAN.md §4.4). Но нужен именно он, а не
 * фреймворк: ради ста строк работы с `FileList` и `fetch` рантайм React
 * привозил 174 КБ — на страницу, которую открывают в зале, где вайфай
 * поделён на полторы сотни человек.
 *
 * Скрипт инлайновый по той же причине, что и стили: отдельный файл — это
 * ещё один запрос по сети, которой почти нет.
 */
import { esc } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";

const SCRIPT = `
(function(){
  var form = document.getElementById('picker');
  if (!form) return;
  var input = document.getElementById('files');
  var list = document.getElementById('queue');
  var counter = document.getElementById('left');
  var title = form.querySelector('b');
  var left = Number(form.dataset.left);
  var limit = Number(form.dataset.limit);
  var auth = form.dataset.token ? {token: form.dataset.token} : {eventId: form.dataset.event};

  function row(name){
    var li = document.createElement('li');
    li.className = 'item';
    var img = document.createElement('span');
    img.className = 'thumb';
    var box = document.createElement('span');
    var title = document.createElement('b');
    title.textContent = name;
    var state = document.createElement('span');
    state.className = 'muted small';
    state.textContent = 'в очереди';
    box.appendChild(title); box.appendChild(document.createElement('br')); box.appendChild(state);
    li.appendChild(img); li.appendChild(box);
    list.insertBefore(li, list.firstChild);
    return {state: state, thumb: img};
  }

  /* Превью: тот же путь, что и в первой версии на React — createImageBitmap
     плюс canvas. Не получилось (старый телефон, HEIC) — грузим без превью:
     потерять единственный кадр хуже, чем показать его в модерации без картинки. */
  function makeThumb(file){
    return createImageBitmap(file).then(function(bitmap){
      var scale = Math.min(1, 400 / Math.max(bitmap.width, bitmap.height));
      var w = Math.max(1, Math.round(bitmap.width * scale));
      var h = Math.max(1, Math.round(bitmap.height * scale));
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, w, h);
      var size = {w: bitmap.width, h: bitmap.height};
      bitmap.close();
      return new Promise(function(resolve){
        canvas.toBlob(function(blob){ resolve(blob ? {blob: blob, size: size} : null); }, 'image/webp', 0.82);
      });
    }).catch(function(){ return null; });
  }

  function post(url, payload){
    return fetch(url, {method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify(Object.assign({}, auth, payload))});
  }

  function upload(file, ui){
    ui.state.textContent = 'готовим превью';
    return post('/api/guest/photos/presign', {contentType: file.type, bytes: file.size})
      .then(function(res){
        if (!res.ok) return res.json().then(function(b){ throw new Error(b.error || 'не получилось'); });
        return res.json();
      })
      .then(function(ticket){
        return makeThumb(file).then(function(thumb){
          ui.state.textContent = 'отправляем';
          if (thumb) {
            var url = URL.createObjectURL(thumb.blob);
            ui.thumb.style.backgroundImage = 'url(' + url + ')';
          }
          return fetch(ticket.uploadUrl, {method:'PUT', headers:{'content-type': file.type}, body: file})
            .then(function(put){
              if (!put.ok) throw new Error('файл не долетел — попробуйте ещё раз');
              if (!thumb) return false;
              return fetch(ticket.thumbUploadUrl, {method:'PUT',
                headers:{'content-type':'image/webp'}, body: thumb.blob}).then(function(r){ return r.ok; });
            })
            .then(function(previewOk){
              return post('/api/guest/photos/complete', {
                storageKey: ticket.storageKey, thumbKey: ticket.thumbKey,
                width: thumb ? thumb.size.w : 0, height: thumb ? thumb.size.h : 0,
                previewOk: !!previewOk
              }).then(function(res){
                if (!res.ok) return res.json().then(function(b){ throw new Error(b.error || 'не получилось'); });
                return res.json().then(function(done){
                  left = done.left;
                  counter.textContent = left > 0 ? 'Осталось ' + left + ' из ' + limit
                                                 : 'Вы прислали все ' + limit;
                  /* Заголовок тоже меняем: «Выбрать фотографии» над
                     выключенным полем выглядит как поломка. */
                  if (title) title.textContent = left > 0 ? 'Выбрать фотографии'
                                                          : 'Больше фотографий не принимаем';
                  ui.state.textContent = previewOk ? 'отправлено на модерацию'
                                                   : 'отправлено, превью не получилось';
                });
              });
            });
        });
      })
      .catch(function(error){
        ui.state.textContent = error.message || 'не получилось';
        ui.state.className = 'err small';
      });
  }

  input.addEventListener('change', function(){
    var files = Array.prototype.slice.call(input.files || []);
    input.value = '';
    if (!files.length) return;

    var accepted = files.slice(0, Math.max(0, left));
    if (files.length > accepted.length) {
      /* Молча обрезать нельзя: гость решит, что ушло всё. */
      row('Ещё ' + (files.length - accepted.length) + ' фото не приняты').state.textContent =
        'больше ' + limit + ' не принимаем';
    }

    input.disabled = true;
    /* По одному файлу: у телефона и память скромная, и связь рвётся —
       на середине пачки половина оказалась бы загруженной без следа. */
    accepted.reduce(function(chain, file){
      var ui = row(file.name);
      return chain.then(function(){ return upload(file, ui); });
    }, Promise.resolve()).then(function(){
      input.disabled = left <= 0;
    });
  });
})();
`.trim();

const EXTRA_CSS = `
.picker{display:block;margin:0 1.5rem;padding:2rem 1.5rem;border:1px dashed #c9bfb3;border-radius:1rem;
text-align:center;cursor:pointer}
.picker input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.picker b{display:block;font-size:1.125rem;font-weight:500}
.queue{list-style:none;margin:1.25rem 1.5rem 0;padding:0}
.item{display:flex;gap:.75rem;align-items:center;padding:.625rem .75rem;border:1px solid var(--line);
border-radius:.75rem;margin-bottom:.5rem;font-size:.9375rem}
.thumb{flex:0 0 3rem;height:3rem;border-radius:.5rem;background:#efeae3 center/cover no-repeat}
.err{color:#8a2b2b}
.grid{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin:.75rem 0 0;padding:0}
.grid img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:.5rem}
.grid figcaption{font-size:.75rem;color:var(--muted);text-align:center;margin-top:.25rem}
`.replace(/\n/g, "");

export type MyPhoto = { id: string; status: string };

const STATUS: Record<string, string> = {
  PENDING: "на модерации",
  APPROVED: "опубликовано",
  REJECTED: "не подошло",
};

export function photosPage(opts: {
  eventId: string;
  eventTitle: string;
  guestName: string;
  /** Токен именной ссылки, если гость пришёл по ней. */
  token: string | null;
  enabled: boolean;
  left: number;
  limit: number;
  mine: MyPhoto[];
  gallery: { id: string }[];
  wishHref: string | null;
  backHref: string;
  backLabel: string;
}): string {
  const media = (id: string, size = "") => `/api/media/${opts.eventId}/${id}${size}`;

  const picker = opts.enabled
    ? `<label class="picker" id="picker" data-left="${opts.left}" data-limit="${opts.limit}"
data-token="${esc(opts.token ?? "")}" data-event="${esc(opts.eventId)}">
  <input id="files" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple${
    opts.left <= 0 ? " disabled" : ""
  }>
  <b>${opts.left > 0 ? "Выбрать фотографии" : "Больше фотографий не принимаем"}</b>
  <span class="muted small" id="left">${
    opts.left > 0 ? `Осталось ${opts.left} из ${opts.limit}` : `Вы прислали все ${opts.limit}`
  }</span>
</label>
<ul class="queue" id="queue"></ul>
<noscript><p class="error">Для загрузки фотографий нужен включённый JavaScript:
браузер сам готовит уменьшенную копию и отправляет файл в хранилище.</p></noscript>`
    : `<section><p class="center small muted">Загрузка фотографий закрыта организатором.</p></section>`;

  const mine =
    opts.mine.length === 0
      ? ""
      : `<section><h2>Ваши фотографии</h2><ul class="grid">
${opts.mine
  .map(
    (photo) => `<li><figure style="margin:0"><img src="${media(photo.id)}" alt="" loading="lazy">
<figcaption>${esc(STATUS[photo.status] ?? photo.status)}</figcaption></figure></li>`,
  )
  .join("")}</ul></section>`;

  const gallery =
    opts.gallery.length === 0
      ? `<section><h2>Общая галерея</h2><p class="center small muted">Пока пусто. Фотографии
появятся здесь после проверки организатором.</p></section>`
      : `<section><h2>Общая галерея</h2><ul class="grid">
${opts.gallery
  .map(
    (photo) =>
      `<li><a href="${media(photo.id, "?size=full")}" target="_blank" rel="noreferrer">
<img src="${media(photo.id)}" alt="" loading="lazy"></a></li>`,
  )
  .join("")}</ul></section>`;

  return invitePage({
    title: "Фотографии",
    noindex: true,
    extraCss: EXTRA_CSS,
    script: opts.enabled ? SCRIPT : undefined,
    body: `<section style="padding-bottom:1rem">
<h1 class="center" style="font-size:1.5rem">Фотографии</h1>
<p class="center small muted">${esc(opts.guestName)} · ${esc(opts.eventTitle)}</p>
</section>
${picker}
${mine}
${gallery}
${opts.wishHref ? `<div class="links"><a href="${esc(opts.wishHref)}">Написать пожелание</a></div>` : ""}
<p class="foot"><a href="${esc(opts.backHref)}">${esc(opts.backLabel)}</a></p>`,
  });
}
