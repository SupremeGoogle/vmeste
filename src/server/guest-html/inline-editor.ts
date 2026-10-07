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
 *   data-inline-edit data-block-id data-path   — текст; поле dateText
 *                                                 (дата и город на обложке)
 *                                                 открывает панель «Имена,
 *                                                 дата и место» с календарём;
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
  /** Устойчивый ключ самостоятельного элемента, включая календарь и декор. */
  component: (key: string) => string;
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
  component: () => "",
  text: () => "",
  image: () => "",
  link: () => "",
  color: () => "",
  tools: () => "",
  section: () => "",
  enabled: false,
};

export function editAttrs(blockId: string, editable: boolean): EditAttrs {
  const media = (path: string) => ` data-media-block="${esc(blockId)}" data-media-path="${esc(path)}"`;
  const component = (key: string) => ` data-component-key="${esc(key)}" data-component-owner="${esc(blockId)}"`;
  if (!editable) return { ...NONE, component, text: (path) => component(`field:${path}`), color: (path) => component(`field:${path}`), image: (path) => media(path) + component(`field:${path}`), section: () => ` data-content-block="${esc(blockId)}"` };
  const id = esc(blockId);
  const target = (kind: string, path: string) =>
    ` data-${kind} data-block-id="${id}" data-path="${esc(path)}"`;
  return {
    component,
    text: (path, opts = {}) =>
      `${target("inline-edit", path)}${opts.multiline ? ' data-multiline="true"' : ""}${
        opts.join ? ` data-join="${esc(opts.join)}"` : ""
      }${component(`field:${path}`)}`,
    image: (path) => target("image-edit", path) + media(path) + component(`field:${path}`),
    link: (path, current) =>
      `<button type="button" class="ie-link" data-editor-ui${target("link-edit", path)} data-current="${esc(current)}">${current ? "изменить ссылку" : "добавить ссылку"}</button>`,
    color: (path) => target("color-edit", path) + component(`field:${path}`),
    tools: () =>
      `<div class="ie-tools" data-editor-ui aria-label="Действия с разделом"><button type="button" data-block-action="up" title="Поднять раздел">↑</button><button type="button" data-block-action="down" title="Опустить раздел">↓</button><button type="button" data-block-action="hide" title="Скрыть раздел">Скрыть</button><button type="button" data-block-action="duplicate" title="Сделать копию раздела">Копия</button><button type="button" data-block-action="delete" title="Удалить раздел">Удалить</button></div><button type="button" class="ie-insert" data-editor-ui data-block-action="insert-after" title="Добавить раздел ниже">+ Раздел</button>`,
    // Отдельный признак раздела: `data-block-id` есть и у самих полей, и
    // стили раздела не должны задевать картинку с абсолютным положением.
    section: () => ` data-content-block="${id}" data-block-id="${id}" data-block-section`,
    enabled: true,
  };
}

export const INLINE_EDITOR_SCRIPT = `(function(){
var d=document;d.documentElement.classList.add('ie-editing');
var active=null,original='';
var component=null,componentTimer=null;
function send(p){parent.postMessage(Object.assign({source:'invite-canvas'},p),'*')}
var componentTools=d.createElement('div');componentTools.className='ie-component-tools';componentTools.setAttribute('data-editor-ui','');
componentTools.hidden=true;componentTools.innerHTML='<span></span><button type="button" aria-label="Удалить элемент">Удалить элемент ×</button>';d.body.appendChild(componentTools);
function clearComponent(){if(component)component.classList.remove('ie-component-focus');component=null;componentTools.hidden=true}
d.addEventListener('pointerover',function(e){
 if(componentTimer)clearTimeout(componentTimer);
 if(e.target.closest('.ie-component-tools'))return;
 var el=e.target.closest('a[data-invite-component],button[data-invite-component]')||e.target.closest('[data-invite-component]');
 if(!el||el.closest('[data-editor-ui]')||el.closest('[data-component-removed]')){clearComponent();return}
 if(component&&component!==el)component.classList.remove('ie-component-focus');component=el;el.classList.add('ie-component-focus');
 componentTools.querySelector('span').textContent=(el.dataset.componentLabel||'Элемент').split(' · ')[0];componentTools.hidden=false;
 var r=el.getBoundingClientRect();var w=componentTools.offsetWidth;componentTools.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';componentTools.style.top=Math.max(8,Math.min(innerHeight-42,r.top-36))+'px';
},true);
d.addEventListener('pointerout',function(e){if(e.target.closest('[data-invite-component],.ie-component-tools'))componentTimer=setTimeout(clearComponent,300)},true);
function owner(el){var s=el.closest('[data-block-section]')||el.closest('[data-block-id]');return s?s.getAttribute('data-block-id'):''}
function valueOf(f){var v=f.innerText.replace(/\\u00a0/g,' ');
 if(f.dataset.join){return v.split(/\\n+/).map(function(x){return x.trim()}).filter(Boolean).join(f.dataset.join)}
 if(f.dataset.multiline!=='true'){return v.replace(/\\s*\\n\\s*/g,' ').trim()}
 return v.replace(/[ \\t]+\\n/g,'\\n').replace(/\\n{3,}/g,'\\n\\n').trim()}
d.addEventListener('click',function(e){
 if(e.target.closest('.ie-component-tools button')){e.preventDefault();e.stopPropagation();if(component){send({kind:'component-action',blockId:component.dataset.componentOwner,path:component.dataset.inviteComponent,action:'remove'});clearComponent()}return}
 var tool=e.target.closest('[data-block-action]');
 if(tool){e.preventDefault();e.stopPropagation();send({kind:'block-action',action:tool.dataset.blockAction,blockId:owner(tool),index:tool.dataset.itemIndex==null?undefined:Number(tool.dataset.itemIndex)});return}
 var link=e.target.closest('[data-link-edit]');
 if(link){e.preventDefault();e.stopPropagation();send({kind:'link-edit',blockId:link.dataset.blockId,path:link.dataset.path,current:link.dataset.current||''});return}
 var color=e.target.closest('[data-color-edit]');
 if(color){e.preventDefault();e.stopPropagation();send({kind:'color-edit',blockId:color.dataset.blockId,path:color.dataset.path,current:color.dataset.color||''});return}
 var image=e.target.closest('[data-image-edit]');
 if(image){e.preventDefault();e.stopPropagation();send({kind:'image-edit',blockId:image.dataset.blockId,path:image.dataset.path,current:image.getAttribute('src')||'',settings:image.dataset.photoSettings||'',ratio:image.clientWidth/Math.max(1,image.clientHeight)});return}
 var nav=e.target.closest('[data-editor-nav]');
 if(nav){e.preventDefault();e.stopPropagation();top.location.href=nav.getAttribute('href');return}
 var field=e.target.closest('[data-inline-edit]');
 if(!field){if(e.target.closest('a,button,input,label,form')){e.preventDefault()}return}
 if(field.dataset.path==='dateText'){e.preventDefault();e.stopPropagation();send({kind:'wedding-edit',focus:'eventDate'});return}
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
 if(m.kind==='scroll'){window.scrollTo(0,m.y||0)}
 if(m.kind==='scroll-to'){var sec=d.querySelector('[data-block-section][data-block-id="'+CSS.escape(m.blockId||'')+'"]');if(sec){sec.scrollIntoView({behavior:'smooth',block:'start'});sec.classList.add('ie-flash');setTimeout(function(){sec.classList.remove('ie-flash')},1400)}}});
window.addEventListener('message',function(e){if(e.source!==parent)return;var m=e.data||{};if(m.source!=='invite-editor'||m.kind!=='scroll-component')return;
 var el=d.querySelector('[data-component-owner="'+CSS.escape(m.blockId||'')+'"][data-invite-component="'+CSS.escape(m.path||'')+'"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('ie-component-focus');setTimeout(function(){el.classList.remove('ie-component-focus')},1600)}});
window.addEventListener('scroll',function(){send({kind:'scroll',y:window.scrollY});clearComponent()},{passive:true});
send({kind:'canvas-ready'});
})()`;

export const INLINE_EDITOR_CSS = `
[data-component-removed],[data-component-shell-removed]{display:none!important}
.ie-component-focus{outline:2px solid #c79a55!important;outline-offset:4px}
.ie-component-tools{position:fixed!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:10px!important;padding:5px 6px 5px 10px!important;border:1px solid #ffffff30!important;border-radius:9px!important;background:#292521!important;color:#fff!important;box-shadow:0 5px 20px #0003!important;font:500 11px/1.3 system-ui,sans-serif!important;letter-spacing:normal!important;text-transform:none!important;width:max-content!important}
.ie-component-tools[hidden]{display:none!important}
.ie-component-tools button{display:block!important;position:static!important;border:0!important;border-radius:5px!important;background:#f7e5c8!important;color:#39291a!important;padding:7px 9px!important;margin:0!important;width:auto!important;height:auto!important;font:600 11px/1.3 system-ui,sans-serif!important;letter-spacing:normal!important;text-transform:none!important;cursor:pointer!important}
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
.ie-insert{position:absolute;z-index:61;left:50%;bottom:-.9rem;transform:translateX(-50%);opacity:0;border:1px solid #c79a55!important;background:#fff8ee!important;color:#8b6914!important;border-radius:999px!important;padding:.35rem .9rem!important;font:600 12px/1 system-ui,sans-serif!important;cursor:pointer;box-shadow:0 4px 14px #0002;width:auto!important;margin:0!important;transition:opacity .15s}
[data-block-section]:hover>.ie-insert{opacity:1}
[data-block-section].ie-flash{outline:3px solid #c79a55;outline-offset:-3px;transition:outline-color .6s}
@media(hover:none){.ie-tools,.ie-insert{opacity:1;transform:none}.ie-insert{transform:translateX(-50%)}}
`.replace(/\n/g, "");
