/**
 * Редактирование прямо на странице приглашения — для всех шаблонов.
 *
 * Начало положил визуальный редактор «Эвергрина»: страница открывается в
 * iframe, у редактируемых элементов есть атрибуты, по щелчку текст правится
 * на месте, а картинка выбирается в окне редактора. Здесь то же самое,
 * вынесенное из шаблона: любой рендерер помечает свои поля, и одна пара
 * «скрипт + стили» делает их редактируемыми.
 *
 * Разметка, которую понимает скрипт:
 *   data-inline-edit data-block-id data-path   — текст;
 *     data-multiline="true"                     — Enter переносит строку;
 *     data-join=" и "                           — строки склеиваются этим
 *                                                 (имена, разнесённые на две);
 *   data-image-edit  data-block-id data-path    — картинка;
 *   data-link-edit   data-block-id data-path    — ссылка (кнопка карты);
 *   data-color-edit  data-block-id data-path    — цвет палитры;
 *   [data-block-id] [data-block-action=up|down|hide] — действия с разделом.
 *
 * Скрипт ничего не сохраняет сам: он отправляет сообщение родительскому окну,
 * а сохраняет редактор через серверное действие с проверкой прав и схемы.
 */
import { esc } from "@/server/guest-html/layout";

export type EditAttrs = {
  /** Атрибуты текстового поля или пустая строка вне редактора. */
  text: (path: string, opts?: { multiline?: boolean; join?: string }) => string;
  image: (path: string) => string;
  /** Кнопка «изменить ссылку», видна только в редакторе. */
  link: (path: string, current: string) => string;
  color: (path: string) => string;
  /** Панель «вверх / вниз / скрыть» внутри раздела. */
  tools: () => string;
  /** Атрибут раздела: по нему скрипт находит, к какому разделу относится действие. */
  section: () => string;
  enabled: boolean;
};

const NONE: EditAttrs = {
  text: () => "",
  image: () => "",
  link: () => "",
  color: () => "",
  tools: () => "",
  section: () => "",
  enabled: false,
};

export function editAttrs(blockId: string, editable: boolean): EditAttrs {
  if (!editable) return NONE;
  const id = esc(blockId);
  const target = (kind: string, path: string) =>
    ` data-${kind} data-block-id="${id}" data-path="${esc(path)}"`;
  return {
    text: (path, opts = {}) =>
      `${target("inline-edit", path)}${opts.multiline ? ' data-multiline="true"' : ""}${
        opts.join ? ` data-join="${esc(opts.join)}"` : ""
      }`,
    image: (path) => target("image-edit", path),
    link: (path, current) =>
      `<button type="button" class="ie-link" data-editor-ui${target("link-edit", path)} data-current="${esc(current)}">${current ? "изменить ссылку" : "добавить ссылку"}</button>`,
    color: (path) => target("color-edit", path),
    tools: () =>
      `<div class="ie-tools" data-editor-ui aria-label="Действия с разделом"><button type="button" data-block-action="up" title="Поднять раздел">↑</button><button type="button" data-block-action="down" title="Опустить раздел">↓</button><button type="button" data-block-action="hide" title="Скрыть раздел">Скрыть</button></div>`,
    // Отдельный признак раздела: `data-block-id` есть и у самих полей, и
    // стили раздела не должны задевать картинку с абсолютным положением.
    section: () => ` data-block-id="${id}" data-block-section`,
    enabled: true,
  };
}

export const INLINE_EDITOR_SCRIPT = `(function(){
var d=document;d.documentElement.classList.add('ie-editing');
var active=null,original='';
function send(p){parent.postMessage(Object.assign({source:'invite-canvas'},p),'*')}
function owner(el){var s=el.closest('[data-block-section]')||el.closest('[data-block-id]');return s?s.getAttribute('data-block-id'):''}
function valueOf(f){var v=f.innerText.replace(/\\u00a0/g,' ');
 if(f.dataset.join){return v.split(/\\n+/).map(function(x){return x.trim()}).filter(Boolean).join(f.dataset.join)}
 if(f.dataset.multiline!=='true'){return v.replace(/\\s*\\n\\s*/g,' ').trim()}
 return v.replace(/[ \\t]+\\n/g,'\\n').replace(/\\n{3,}/g,'\\n\\n').trim()}
d.addEventListener('click',function(e){
 var tool=e.target.closest('[data-block-action]');
 if(tool){e.preventDefault();e.stopPropagation();send({kind:'block-action',action:tool.dataset.blockAction,blockId:owner(tool),index:tool.dataset.itemIndex==null?undefined:Number(tool.dataset.itemIndex)});return}
 var link=e.target.closest('[data-link-edit]');
 if(link){e.preventDefault();e.stopPropagation();send({kind:'link-edit',blockId:link.dataset.blockId,path:link.dataset.path,current:link.dataset.current||''});return}
 var color=e.target.closest('[data-color-edit]');
 if(color){e.preventDefault();e.stopPropagation();send({kind:'color-edit',blockId:color.dataset.blockId,path:color.dataset.path,current:color.dataset.color||''});return}
 var image=e.target.closest('[data-image-edit]');
 if(image){e.preventDefault();e.stopPropagation();send({kind:'image-edit',blockId:image.dataset.blockId,path:image.dataset.path,current:image.getAttribute('src')||''});return}
 var field=e.target.closest('[data-inline-edit]');
 if(!field){if(e.target.closest('a,button,input,label,form')){e.preventDefault()}return}
 e.preventDefault();e.stopPropagation();
 if(active===field)return;
 if(active)active.blur();
 active=field;original=valueOf(field);field.contentEditable='true';field.focus();
 var r=d.createRange();r.selectNodeContents(field);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r)
},true);
d.addEventListener('submit',function(e){e.preventDefault()},true);
d.addEventListener('keydown',function(e){if(!active)return;
 if(e.key==='Escape'){active.dataset.cancel='1';active.blur()}
 if(e.key==='Enter'&&!e.shiftKey&&active.dataset.multiline!=='true'){e.preventDefault();active.blur()}});
d.addEventListener('paste',function(e){if(!active)return;e.preventDefault();
 var t=(e.clipboardData||window.clipboardData).getData('text/plain');d.execCommand('insertText',false,t)});
d.addEventListener('focusout',function(e){var f=e.target.closest&&e.target.closest('[data-inline-edit]');if(!f||f!==active)return;
 f.contentEditable='false';active=null;
 if(f.dataset.cancel){delete f.dataset.cancel;send({kind:'reload'});return}
 var v=valueOf(f);if(v!==original)send({kind:'text-edit',blockId:f.dataset.blockId,path:f.dataset.path,value:v})});
window.addEventListener('message',function(e){var m=e.data||{};if(m.source!=='invite-editor')return;
 var q='[data-block-id="'+CSS.escape(m.blockId||'')+'"][data-path="'+CSS.escape(m.path||'')+'"]';
 if(m.kind==='image-saved'){var i=d.querySelector('[data-image-edit]'+q);if(i)i.src=m.value}
 if(m.kind==='link-saved'){var a=d.querySelector('[data-link-edit]'+q);if(a)a.dataset.current=m.value}
 if(m.kind==='color-saved'){var c=d.querySelector('[data-color-edit]'+q);if(c){c.style.background=m.value;c.dataset.color=m.value}}
 if(m.kind==='scroll'){window.scrollTo(0,m.y||0)}});
window.addEventListener('scroll',function(){send({kind:'scroll',y:window.scrollY})},{passive:true});
})()`;

export const INLINE_EDITOR_CSS = `
[data-inline-edit],[data-image-edit],[data-link-edit],[data-color-edit]{cursor:pointer;outline:1px dashed transparent;outline-offset:4px;transition:outline-color .15s,background-color .15s}
[data-inline-edit]:hover,[data-link-edit]:hover{outline-color:#c79a55;background-color:#fff5e633}
[data-inline-edit][contenteditable=true]{outline:2px solid #c79a55;background-color:#fff8ee;cursor:text;color:inherit}
[data-image-edit]:hover,[data-color-edit]:hover{outline:3px solid #c79a55;outline-offset:2px}
[data-inline-edit]:empty::before{content:'пусто — нажмите, чтобы вписать';opacity:.45;font-style:italic}
.ie-image-placeholder{display:flex!important;align-items:center;justify-content:center;min-height:9rem;width:100%;padding:1rem;border:2px dashed #c79a55!important;background:#fff8eee6!important;color:#765d3d!important;font:600 13px/1.4 system-ui,sans-serif!important;text-align:center;letter-spacing:0!important;text-transform:none!important}
[data-block-section]{position:relative}
.ie-tools{position:absolute;z-index:60;right:.75rem;top:.75rem;display:flex;gap:.35rem;opacity:0;transform:translateY(-4px);transition:.15s}
[data-block-section]:hover>.ie-tools{opacity:1;transform:none}
.ie-tools button{border:1px solid #ffffff40;background:#2a1d0de6;color:#fff;padding:.45rem .6rem;border-radius:.4rem;font:600 12px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px #0003;width:auto;margin:0}
.ie-link{display:inline-block;margin:.5rem auto 0;padding:.35rem .7rem;border:1px dashed #c79a55;border-radius:.4rem;background:#fff8ee;color:#8b6914;font:500 12px/1.2 system-ui,sans-serif;width:auto}
.ie-remove-detail{position:absolute;right:.25rem;top:.25rem;z-index:5;border:0!important;background:#2a1d0dcc!important;color:#fff!important;border-radius:999px!important;width:1.7rem!important;height:1.7rem!important;padding:0!important;font:700 14px/1 system-ui,sans-serif!important;cursor:pointer}
.ie-editing a,.ie-editing button:not([data-block-action]),.ie-editing input,.ie-editing label{cursor:pointer}
@media(hover:none){.ie-tools{opacity:1;transform:none}}
`.replace(/\n/g, "");
