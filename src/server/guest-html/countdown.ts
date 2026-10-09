/**
 * Обратный отсчёт для шаблонов, у которых нет своего (стандарт, §11).
 *
 * Четыре карточки — дни, часы, минуты, секунды — в цветах и шрифте самого
 * шаблона: рамки и фон считаются от `currentColor`, цифры берут шрифт
 * заголовков, поэтому таймер одинаково уместен в светлом «Шёлке» и в
 * тёмном «Созвездии». Числа приходят с сервера уже посчитанными:
 * приглашение выглядит законченным и без скрипта, а скрипт только ведёт
 * отсчёт дальше.
 *
 * Дата берётся у мероприятия, а не из блока: две даты в двух местах
 * разойдутся ровно в тот день, когда это важно.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import { esc } from "@/server/guest-html/layout";
import type { EditAttrs } from "@/server/guest-html/inline-editor";
import { L, labelText, templateLanguage } from "@/server/guest-html/template-labels";

const UNITS = [
  { unit: "days", words: ["день", "дня", "дней"] },
  { unit: "hours", words: ["час", "часа", "часов"] },
  { unit: "minutes", words: ["минута", "минуты", "минут"] },
  { unit: "seconds", words: ["секунда", "секунды", "секунд"] },
] as const;

function plural(value: number, forms: readonly [string, string, string]): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  const mod10 = value % 10;
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export const COUNTDOWN_CSS = `
.vm-cd{display:flex;align-items:stretch;justify-content:center;gap:clamp(.35rem,1.6vw,.7rem);max-width:28rem;margin:1.5rem auto 0;color:inherit}
.vm-cd-cell{position:relative;flex:1 1 0;min-width:0;padding:1rem .2rem .85rem;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:1.1rem;background:color-mix(in srgb,currentColor 5%,transparent);box-shadow:0 10px 26px -18px color-mix(in srgb,currentColor 60%,transparent);text-align:center;overflow:hidden}
.vm-cd-cell::after{content:"";position:absolute;left:18%;right:18%;top:50%;height:1px;background:color-mix(in srgb,currentColor 10%,transparent)}
.vm-cd-cell b{position:relative;z-index:1;display:block;font-family:var(--serif,inherit);font-size:clamp(1.75rem,8.4vw,2.7rem);font-weight:400;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;transition:opacity .25s ease,transform .25s ease}
.vm-cd-cell b.vm-cd-tick{opacity:.35;transform:translateY(-.18em)}
.vm-cd-cell>span{position:relative;z-index:1;display:block;margin-top:.5rem;font-size:clamp(9.5px,2.6vw,.66rem);letter-spacing:clamp(.04em,.5vw,.16em);text-transform:uppercase;opacity:.68}.vm-cd-cell>span>span{display:inline;margin:0;font:inherit;letter-spacing:inherit;opacity:1}
.vm-cd-done{margin:1.25rem auto 0;font-size:1.15em;font-style:italic}
@media(prefers-reduced-motion:reduce){.vm-cd-cell b{transition:none}}
`.replace(/\n/g, "");

/** Сколько осталось — дни, часы, минуты, секунды. */
function parts(eventDate: Date): Record<string, number> {
  const left = Math.max(0, eventDate.getTime() - Date.now());
  const seconds = Math.floor(left / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  };
}

/** Карточки отсчёта без раздела вокруг — для шаблонов со своей рамкой. */
export function countdownCells(content: BlockContentMap["COUNTDOWN"], eventDate: Date, e?: EditAttrs): string {
  if (eventDate.getTime() <= Date.now()) {
    return `<p class="vm-cd-done"${e?.text("doneText") ?? ""}>${esc(content.doneText)}</p>`;
  }
  const value = parts(eventDate);
  const en = templateLanguage() === "en";
  const cells = UNITS.map(({ unit, words }) =>
    `<div class="vm-cd-cell"><b data-unit="${unit}">${String(value[unit]).padStart(unit === "days" ? 1 : 2, "0")}</b><span data-word="${unit}" data-label="${esc(labelText(`countdown.${unit}`, ""))}">${L(`countdown.${unit}`, en ? (value[unit] === 1 ? unit.slice(0, -1) : unit) : plural(value[unit], words))}</span></div>`,
  ).join("");
  return `<style>${COUNTDOWN_CSS}</style><div class="vm-cd"${e?.component("widget:countdown") ?? ""} data-locale="${templateLanguage()}" data-until="${eventDate.getTime()}" data-done="${esc(content.doneText)}">${cells}</div>`;
}

/**
 * Скрипт отсчёта: раз в секунду, только пока таймер на экране. Инлайном —
 * отдельный файл это ещё один запрос по сети, которой в дороге почти нет.
 */
export const COUNTDOWN_SCRIPT = `(function(){var list=document.querySelectorAll('.vm-cd');if(!list.length)return;
var W={days:['день','дня','дней'],hours:['час','часа','часов'],minutes:['минута','минуты','минут'],seconds:['секунда','секунды','секунд']};
function f(v,w){var a=v%100;if(a>10&&a<15)return w[2];var b=v%10;return b===1?w[0]:(b>1&&b<5?w[1]:w[2])}
var seen=new Set();if('IntersectionObserver'in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting)seen.add(x.target);else seen.delete(x.target)})});list.forEach(function(n){io.observe(n)})}else list.forEach(function(n){seen.add(n)});
function t(){list.forEach(function(n){if(!seen.has(n))return;var l=+n.dataset.until-Date.now();
if(l<=0){var p=document.createElement('p');p.className='vm-cd-done';p.textContent=n.dataset.done;n.replaceWith(p);return}
var s=Math.floor(l/1e3),v={days:Math.floor(s/86400),hours:Math.floor(s/3600)%24,minutes:Math.floor(s/60)%60,seconds:s%60};
for(var k in v){var b=n.querySelector('[data-unit='+k+']'),w=n.querySelector('[data-word='+k+']');if(!b)continue;
var txt=k==='days'?String(v[k]):String(v[k]).padStart(2,'0');if(b.textContent!==txt){b.textContent=txt;if(k!=='seconds'){b.classList.add('vm-cd-tick');setTimeout(function(x){return function(){x.classList.remove('vm-cd-tick')}}(b),180)}}
if(w&&!w.dataset.label)(w.firstElementChild||w).textContent=n.dataset.locale==='en'?(v[k]===1?k.slice(0,-1):k):f(v[k],W[k])}})}
setInterval(t,1000)})()`;
