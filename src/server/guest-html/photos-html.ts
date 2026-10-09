/**
 * Страница фотографий гостя — строка HTML плюс небольшой собственный скрипт.
 *
 * Здесь JavaScript действительно нужен: браузер ужимает кадр в canvas и
 * кладёт его прямо в хранилище (PLAN.md §4.4). Но нужен именно он, а не
 * фреймворк: ради ста строк работы с `FileList` и `fetch` рантайм React
 * привозил 174 КБ — на страницу, которую открывают в зале, где вайфай
 * поделён на полторы сотни человек.
 *
 * Скрипт инлайновый по той же причине, что и стили: отдельный файл — это
 * ещё один запрос по сети, которой почти нет.
 */
import { esc } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import type { InviteTheme } from "@/lib/invite-theme";
import { gl } from "@/server/guest-html/guest-lang";

export const PHOTO_SCRIPT = `
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
  /* Язык — страницы, то есть мероприятия (<html lang>). */
  var EN = document.documentElement.lang === 'en';
  function T(ru, en){ return EN ? en : ru; }

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
    state.textContent = T('в очереди', 'queued');
    box.appendChild(title); box.appendChild(document.createElement('br')); box.appendChild(state);
    li.appendChild(img); li.appendChild(box);
    list.insertBefore(li, list.firstChild);
    return {state: state, thumb: img};
  }

  /* Кадр ужимается прямо в телефоне: 2560 px по длинной стороне в JPEG
     вместо 5–8 МБ исходника — на Wi‑Fi зала это разница между «ушло» и
     «висит». Через <img>, а не createImageBitmap: картинка поворачивается
     по EXIF во всех браузерах, а у createImageBitmap это зависит от версии.
     Браузер не смог открыть файл (HEIC в Chrome, редкий формат) — шлём
     исходник как есть: сервер всё равно перекодирует любой кадр в WebP. */
  var MAX_SIDE = 2560;
  function shrink(file){
    var type = file.type || 'application/octet-stream';
    return new Promise(function(resolve){
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function(){
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, MAX_SIDE / Math.max(w, h, 1));
        var keep = {blob: file, type: type, preview: url};
        if (scale === 1 && file.size < 1536 * 1024 && (type === 'image/jpeg' || type === 'image/webp')) {
          resolve(keep); return;
        }
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        var ctx = canvas.getContext('2d');
        if (!ctx) { resolve(keep); return; }
        /* Белая подложка: прозрачный PNG в JPEG иначе станет чёрным. */
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob){
          resolve(blob && blob.size < file.size ? {blob: blob, type: 'image/jpeg', preview: url} : keep);
        }, 'image/jpeg', 0.9);
      };
      img.onerror = function(){
        URL.revokeObjectURL(url);
        resolve({blob: file, type: type, preview: null});
      };
      img.src = url;
    });
  }

  function post(url, payload){
    return fetch(url, {method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify(Object.assign({}, auth, payload))});
  }

  function failed(res){
    return res.json().catch(function(){ return {}; })
      .then(function(b){ throw new Error(b.error || T('не получилось', 'failed')); });
  }

  function upload(file, ui){
    ui.state.textContent = T('готовим', 'preparing');
    return shrink(file).then(function(prepared){
      if (prepared.preview) ui.thumb.style.backgroundImage = 'url(' + prepared.preview + ')';
      return post('/api/guest/photos/presign', {contentType: prepared.type, bytes: prepared.blob.size})
        .then(function(res){ return res.ok ? res.json() : failed(res); })
        .then(function(ticket){
          ui.state.textContent = T('отправляем', 'uploading');
          return fetch(ticket.uploadUrl, {method:'PUT', headers:{'content-type': prepared.type}, body: prepared.blob})
            .then(function(put){
              if (!put.ok) throw new Error(T('файл не долетел — попробуйте ещё раз', 'upload failed. Please try again'));
              ui.state.textContent = T('обрабатываем', 'processing');
              return post('/api/guest/photos/complete', {storageKey: ticket.storageKey});
            });
        })
        .then(function(res){ return res.ok ? res.json() : failed(res); })
        .then(function(done){
          left = done.left;
          counter.textContent = left > 0 ? T('Осталось ' + left + ' из ' + limit, left + ' of ' + limit + ' left')
                                         : T('Вы прислали все ' + limit, 'You’ve sent all ' + limit);
          /* Заголовок тоже меняем: «Выбрать фотографии» над
             выключенным полем выглядит как поломка. */
          if (title) title.textContent = left > 0 ? T('Выбрать фотографии', 'Choose photos')
                                                  : T('Больше фотографий не принимаем', 'Photo limit reached');
          ui.state.textContent = T('отправлено', 'sent');
          if (!prepared.preview) ui.thumb.style.backgroundImage =
            'url(/api/media/' + form.dataset.event + '/' + done.photoId + ')';
        });
    }).catch(function(error){
      ui.state.textContent = error.message || T('не получилось', 'failed');
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
      row(T('Ещё ' + (files.length - accepted.length) + ' фото не приняты', (files.length - accepted.length) + ' more not accepted')).state.textContent =
        T('больше ' + limit + ' не принимаем', 'the limit is ' + limit);
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

export const PHOTO_CSS = `
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
/* На планшете колонка шире, и три снимка в ряд становятся крупными
   плитками с пустотой по бокам. Четыре ложатся ровно. */
@media(min-width:34rem){.grid{grid-template-columns:repeat(4,1fr);gap:.625rem}}
.grid img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:.5rem}
.grid figcaption{font-size:.75rem;color:var(--muted);text-align:center;margin-top:.25rem}
`.replace(/\n/g, "");

export type MyPhoto = { id: string; status: string };

const STATUS: Record<string, () => string> = {
  PENDING: () => gl("на модерации", "awaiting review"),
  APPROVED: () => gl("опубликовано", "published"),
  REJECTED: () => gl("не подошло", "not approved"),
};

export type PhotoSectionsOpts = {
  eventId: string;
  token: string | null;
  enabled: boolean;
  left: number;
  limit: number;
  mine: MyPhoto[];
  /** Только снимки, без имён: кто прислал фото, другим гостям не видно. */
  gallery: { id: string }[];
};

/** Загрузка, «ваши фото» и общая галерея — на странице фото и на странице гостя. */
export function photoSections(opts: PhotoSectionsOpts): { picker: string; mine: string; gallery: string } {
  const media = (id: string, size = "") => `/api/media/${opts.eventId}/${id}${size}`;

  const picker = opts.enabled
    ? `<label class="picker" id="picker" data-left="${opts.left}" data-limit="${opts.limit}"
data-token="${esc(opts.token ?? "")}" data-event="${esc(opts.eventId)}">
  <input id="files" type="file" accept="image/*,.heic,.heif" multiple${
    opts.left <= 0 ? " disabled" : ""
  }>
  <b>${opts.left > 0 ? gl("Выбрать фотографии", "Choose photos") : gl("Больше фотографий не принимаем", "Photo limit reached")}</b>
  <span class="muted small" id="left">${
    opts.left > 0 ? gl(`Осталось ${opts.left} из ${opts.limit}`, `${opts.left} of ${opts.limit} left`) : gl(`Вы прислали все ${opts.limit}`, `You’ve sent all ${opts.limit}`)
  }</span>
</label>
<ul class="queue" id="queue"></ul>
<noscript><p class="error">${gl(`Для загрузки фотографий нужен включённый JavaScript:
браузер сам готовит уменьшенную копию и отправляет файл в хранилище.`, "Uploading photos requires JavaScript: your browser prepares a smaller copy and sends the file to storage.")}</p></noscript>`
    : `<section><p class="center small muted">${gl("Загрузка фотографий закрыта организатором.", "The organizer has closed photo uploads.")}</p></section>`;

  const mine =
    opts.mine.length === 0
      ? ""
      : `<section><h2>${gl("Ваши фотографии", "Your photos")}</h2><ul class="grid">
${opts.mine
  .map(
    (photo) => `<li><figure style="margin:0"><img src="${media(photo.id)}" alt="" loading="lazy">
<figcaption>${esc(STATUS[photo.status]?.() ?? photo.status)}</figcaption></figure></li>`,
  )
  .join("")}</ul></section>`;

  const gallery =
    opts.gallery.length === 0
      ? `<section><h2>${gl("Общая галерея", "Shared gallery")}</h2><p class="center small muted">${gl(`Пока пусто. Здесь
появятся снимки гостей.`, "Nothing here yet. Guests’ photos will appear here.")}</p></section>`
      : `<section><h2>${gl("Общая галерея", "Shared gallery")}</h2><ul class="grid">
${opts.gallery
  .map(
    (photo) =>
      `<li><a href="${media(photo.id, "?size=full")}" target="_blank" rel="noreferrer">
<img src="${media(photo.id)}" alt="" loading="lazy"></a></li>`,
  )
  .join("")}</ul></section>`;

  return { picker, mine, gallery };
}

export function photosPage(opts: {
  /** Оформление мероприятия: страница гостя должна выглядеть как его
   *  приглашение, а не как отдельный сервис. */
  theme?: InviteTheme;
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
  const { picker, mine, gallery } = photoSections(opts);
  return invitePage({
    theme: opts.theme,
    title: gl("Фотографии", "Photos"),
    noindex: true,
    extraCss: PHOTO_CSS,
    script: opts.enabled ? PHOTO_SCRIPT : undefined,
    body: `<section style="padding-bottom:1rem">
<h1 class="center" style="font-size:1.5rem">${gl("Фотографии", "Photos")}</h1>
<p class="center small muted">${esc(opts.guestName)} · ${esc(opts.eventTitle)}</p>
</section>
${picker}
${mine}
${gallery}
${opts.wishHref ? `<div class="links"><a href="${esc(opts.wishHref)}">${gl("Написать пожелание", "Write a wish")}</a></div>` : ""}
<p class="foot"><a href="${esc(opts.backHref)}">${esc(opts.backLabel)}</a></p>`,
  });
}
