import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliContext } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L, labelText } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";
import once from "./odnazhdy.json";
import happiness from "./little-happiness.json";
import confession from "./priznanie.json";

const DESIGNS = { odnazhdy: once, "little-happiness": happiness, priznanie: confession };
export function isWedwedTemplate(id: string): id is keyof typeof DESIGNS {
  return Object.hasOwn(DESIGNS, id);
}
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const GENITIVE = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Английская свадьба. Вёрстка образцов (`<id>.json`) — русская: подписи
 * вроде «Как добраться» и «Дней» зашиты в разметку. Для английской свадьбы
 * они подменяются здесь, в исходной разметке раздела (до подстановки
 * текстов пары), — русский рендер не трогается.
 */
const EN_COMMON: [string | RegExp, string][] = [
  ['alt="Фотография"', 'alt="Photo"'],
  [">Как добраться<", ">Get directions<"],
  [">Контакты</h2>", ">Contacts</h2>"],
  ["{{l:contact:Связаться}}", "{{l:contact:Get in touch}}"],
  [/\+7 \(926\) 888-77-88/g, "+1 (555) 888-7788"],
  [/\+7 \(916\) 777-88-77/g, "+1 (555) 777-8877"],
  // Числовые даты — в американском порядке: месяц перед днём.
  [/\{\{g:day\}\}([\s\S]{0,240}?)\{\{g:month\}\}/g, "{{g:month}}$1{{g:day}}"],
  [/\{\{g:deadlineDay\}\}([\s\S]{0,240}?)\{\{g:deadlineMonth\}\}/g, "{{g:deadlineMonth}}$1{{g:deadlineDay}}"],
  [/\{\{g:day\}\}([\s\S]{0,120}?)\{\{g:monthGenitive\}\}/g, "{{g:monthGenitive}}$1{{g:day}}"],
];
const EN_UNITS: Record<string, string> = { Дней: "Days", дней: "days", Часов: "Hours", часов: "hours", Часа: "Hours", Минут: "Minutes", минут: "minutes", Секунд: "Seconds", секунд: "seconds" };
const EN_TEXT: Record<keyof typeof DESIGNS, [string, string][]> = {
  odnazhdy: [
    ['{{g:groom}}</span> и <span', '{{g:groom}}</span> &amp; <span'],
    ['{{g:groom}}</span> и<br/>', '{{g:groom}}</span> &amp;<br/>'],
    ['{{g:groom}}</i> и<br/>', '{{g:groom}}</i> &amp;<br/>'],
    ['<span class="nstyle">официально станем семьей</span>', '<span class="nstyle">are officially becoming a family</span>'],
    ['<span class="item-animation item-atop"> любви</span>', '<span class="item-animation item-atop"> of love</span>'],
    ['<span class="item-animation item-aleft">Вас</span>', '<span class="item-animation item-aleft">you</span>'],
    ['<span class="nstyle">Наша свадьба пройдёт в</span>', '<span class="nstyle">Our wedding will take place at</span>'],
    ['<span>Дня</span>', '<span>of the day</span>'],
    ['<span class="nstyle">Для девушек</span>', '<span class="nstyle">For her</span>'],
    ['<span class="nstyle">Для мужчин</span>', '<span class="nstyle">For him</span>'],
    ['<span class="nstyle"> контакты</span>', '<span class="nstyle"> contacts</span>'],
    ['>Подтвердить присутствие</a>', '>RSVP</a>'],
    ['<span class="sm-needtoresize text-no-paint">Вас</span>', '<span class="sm-needtoresize text-no-paint">you</span>'],
  ],
  "little-happiness": [
    ['<span class="sm-cormorantRegular-70-30 mob">и', '<span class="sm-cormorantRegular-70-30 mob">&amp;'],
    ['<p>Сбор гостей</p>', '<p>Guests arrive</p>'],
    ['<p>16:00</p>', '<p>4:00 PM</p>'],
    ['>Подтвердить</div>', '>RSVP</div>'],
    ['<span class="item-animation item-aright">С любовью, </span>', '<span class="item-animation item-aright">With love, </span>'],
    ['<span class="sm-cormorantRegular-70-30">и</span>', '<span class="sm-cormorantRegular-70-30">&amp;</span>'],
  ],
  priznanie: [
    ['>Девушки</div>', '>For her</div>'],
    ['>Мужчины</div>', '>For him</div>'],
    ['>Подтвердить</a>', '>RSVP</a>'],
    ['>С любовью</span>', '>With love</span>'],
  ],
};
/** Служебные теги разделов английского образца → ключи вёрстки (`layout.tag`, `{{x:тег:…}}`). */
const EN_TAGS: Record<string, string> = {
  Welcome: "Обращение", Story: "История", Moments: "Моменты", Wishes: "Пожелания", Contacts: "Контакты", Together: "Вместе", Farewell: "Окончание",
  "Welcome · photos": "Обращение · фотографии", "Story · photos": "История · фотографии", "Farewell · photos": "Окончание · фотографии",
  "More moments": "Дополнительные моменты", "Outfits for her": "Образы для девушек", "Outfits for him": "Образы для мужчин", "Wish 2": "Пожелание 2", "Wish 3": "Пожелание 3",
};
function englishLayout(id: keyof typeof DESIGNS, html: string): string {
  let out = html;
  for (const [from, to] of [...EN_COMMON, ...EN_TEXT[id]]) {
    out = typeof from === "string" ? out.split(from).join(to) : out.replace(from, to);
  }
  return out.replace(/(>\s*)(Дней|дней|Часов|часов|Часа|Минут|минут|Секунд|секунд)(\s*<)/g, (_m, before: string, word: string, after: string) => `${before}${EN_UNITS[word] ?? word}${after}`);
}
/** «16:00» → «4:00 PM» для английской свадьбы. */
function clock12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function parts(date: Date, timezone: string) {
  const values = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (name: string) => values.find(p => p.type === name)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), time: `${get("hour")}:${get("minute")}` };
}
function pathValue(content: unknown, path: string): string {
  let value = content;
  for (const key of path.split(".")) {
    if (typeof value !== "object" || value === null) return "";
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === "string" ? value : "";
}
function calendar(num: string, date: ReturnType<typeof parts>): string {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, 1)).getUTCDay();
  const offset = num === "3" ? weekday : (weekday + 6) % 7;
  const days = new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
  const tag = num === "1" ? "div" : "span";
  const cls = num === "1" ? "sm-calendar__clndr-cell" : num === "2" ? "sm-manropeSemiBold-20" : "sm-calendar-day";
  const active = num === "1" ? "is-active" : num === "2" ? "number-acrive" : "sm-number-active";
  const week = num === "1" ? "" : (guestLang() === "en" ? (num === "3" ? ["su", "mo", "tu", "we", "th", "fr", "sa"] : ["mo", "tu", "we", "th", "fr", "sa", "su"]) : num === "3" ? ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] : ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]).map(w => `<span class="${num === "2" ? "sm-cormorantLight-30-20px" : "sm-calendar-day-week-title"}">${w}</span>`).join("");
  return week + Array.from({ length: offset }, () => `<${tag} class="${cls}"></${tag}>`).join("") + Array.from({ length: days }, (_, i) => `<${tag} class="${cls}${i + 1 === date.day ? ` ${active}` : ""}"${i + 1 === date.day ? ' aria-current="date"' : ""}>${i + 1}</${tag}>`).join("");
}
function formBody(block: InviteBlockView, ctx: TiliContext): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const drinks = r?.drinks ?? (guestLang() === "en" ? ["Champagne", "White wine", "Red wine", "Whisky", "Vodka", "Gin", "Rum", "I don’t drink alcohol"] : ["Шампанское", "Белое вино", "Красное вино", "Виски", "Водка", "Джин", "Ром", "Не пью алкоголь"]).map((title, i) => ({ id: `demo-${i}`, title }));
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? hidden("mealOptionId", r.keep.mealOptionId) + hidden("comment", r.keep.comment) + hidden("musicWish", r.musicWish) + hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId) + r.keep.plusOneDrinkOptionIds.map(id => hidden("plusOneDrinkOptionIds", id)).join("") : "";
  const plusOne = !r || (r as typeof r & { plusOneAllowed?: boolean }).plusOneAllowed !== false;
  return `<input type="hidden" name="from" value="invite">${keep}${r?.saved ? `<p class="wv-notice" role="status">${esc(c.successText || gl("Спасибо! Ваш ответ получен.", "Thank you! We’ve received your reply."))}</p>` : ""}${r?.error ? `<p class="wv-notice" role="alert">${gl("Проверьте анкету или срок ответа.", "Please check your answers or the reply deadline.")}</p>` : ""}
<div class="sm-form__wrapper wv-form-layout"><div class="sm-form__left">
<label class="wv-field"><span${e.text("nameLabel")}>${esc(c.nameLabel || gl("Ваше имя и фамилия", "Your full name"))}</span><input class="sm-form__input" type="text" name="guestName" value="${esc(r?.guestName ?? "")}" required maxlength="120" autocomplete="name"></label>
<fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || gl("Планируете ли вы присутствовать?", "Are you planning to attend?"))}</legend>${["ACCEPTED", "DECLINED"].map((status, i) => `<label class="wv-choice"><input type="radio" name="status" value="${status}" required${r?.status === status ? " checked" : ""}><span${e.text(i ? "noLabel" : "yesLabel")}>${esc(i ? c.noLabel || gl("Не смогу", "Sorry, I can’t") : c.yesLabel || gl("Да, с удовольствием", "Yes, with pleasure"))}</span></label>`).join("")}</fieldset>
${plusOne ? `<label class="wv-field"><span>${L("wedwed.t1", gl("Если вы будете не одни, укажите имя спутника", "If you’re bringing a guest, please add their name"))}</span><input class="sm-form__input" type="text" name="plusOneName" value="${esc(r?.keep.plusOneName ?? "")}" maxlength="120"></label>` : ""}</div>
${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || gl("Ваши предпочтения", "Your preferences"))}</legend>${drinks.map(d => `<label class="wv-choice"><input type="checkbox" name="drinkOptionIds" value="${esc(d.id)}"${r?.chosenDrinks.includes(d.id) ? " checked" : ""}><span>${esc(d.title)}</span></label>`).join("")}</fieldset>`}</div>${r?.extraFields ?? ""}<p class="wv-demo-note" role="status" hidden>${gl("Это образец приглашения. Ответить можно по вашей именной ссылке.", "This is a sample invitation. You can reply using your personal link.")}</p><button class="sm-btn sm-button wv-submit" type="submit"${e.text("buttonLabel")}>${esc(c.buttonLabel)}</button>`;
}

export function renderWedwedBlocks(blocks: InviteBlockView[], theme: InviteTheme, ctx: TiliContext, fallback: (block: InviteBlockView) => string): string {
  if (!isWedwedTemplate(theme.template)) return "";
  const design = DESIGNS[theme.template];
  const cover = blocks.find(b => b.type === "COVER");
  const names = pathValue(cover?.content, "names").split(/\s+(?:и|&|\+)\s+/);
  const date = ctx.eventDate ?? new Date("2026-10-29T13:00:00Z");
  const p = parts(date, ctx.timezone);
  const en = guestLang() === "en";
  const deadlineValue = theme.wedding?.deadline;
  const deadline = deadlineValue && Number.isFinite(new Date(deadlineValue).getTime()) ? parts(new Date(deadlineValue), ctx.timezone) : p;
  const globals: Record<string, string> = {
    groom: names[0] ?? "", bride: names.slice(1).join(gl(" и ", " & ")),
    day: String(p.day).padStart(2, "0"), month: String(p.month).padStart(2, "0"), year: String(p.year).slice(-2), fullYear: String(p.year),
    monthName: (en ? MONTHS_EN : MONTHS)[p.month - 1], monthGenitive: (en ? MONTHS_EN : GENITIVE)[p.month - 1], time: en ? clock12(p.time) : p.time,
    date: en ? `${String(p.month).padStart(2, "0")}/${String(p.day).padStart(2, "0")}/${p.year}` : `${String(p.day).padStart(2, "0")}.${String(p.month).padStart(2, "0")}.${p.year}`, until: String(date.getTime()),
    deadlineDay: String(deadline.day).padStart(2, "0"), deadlineMonth: String(deadline.month).padStart(2, "0"), deadlineYear: String(deadline.year).slice(-2),
  };
  const sourceTags = new Set(design.layouts.map(l => l.tag));
  const supplementalTags = new Set(["Дополнительные моменты", "Образы для девушек", "Образы для мужчин", "Пожелание 2", "Пожелание 3", "Обращение · фотографии", "История · фотографии", "Окончание · фотографии"]);
  // Теги английского образца — по-английски; вёрстка ищет разделы по русским ключам.
  const tagOf = (b: InviteBlockView) => { const raw = pathValue(b.content, "tag"); return en ? EN_TAGS[raw] ?? raw : raw; };
  return blocks.filter(b => b.visible !== false).map(block => {
    const tag = tagOf(block);
    if (supplementalTags.has(tag) && !sourceTags.has(tag)) return "";
    const layout = design.layouts.find(l => l.type === block.type && l.tag === tag) ?? design.layouts.find(l => l.type === block.type && !l.tag);
    if (!layout) return fallback(block);
    const e = editAttrs(block.id, ctx.editable);
    let html = (en ? englishLayout(theme.template as keyof typeof DESIGNS, layout.html) : layout.html).replace(/\{\{([^{}]+)\}\}/g, (_, token: string) => {
      const [kind, key, ...rest] = token.split(":");
      if (kind === "v") return esc(pathValue(block.content, key));
      if (kind === "g") return esc(globals[key] ?? "");
      // Подписи, которых нет в разделе (телефоны пары, текст кнопки), —
      // редактируемые подписи шаблона: {{l:ключ:образец}}, ссылка tel: — {{tel:ключ:образец}}.
      if (kind === "l") return L(`${theme.template}.${key}`, rest.join(":"));
      if (kind === "tel") return esc(labelText(`${theme.template}.${key}`, rest.join(":")).replace(/[^\d+]/g, ""));
      if (kind === "a") return e.text(key, { multiline: ["text", "message", "address"].includes(key) });
      if (kind === "i") return e.image(key);
      if (kind === "section") return key === "attrs" ? e.section() : e.tools();
      if (kind === "calendar") return calendar(key, p);
      if (kind === "clock") return theme.template === "odnazhdy" ? "00" : '<div class="sm-timer-time_number"><span class="sm-timer-time_number-span">0</span></div>'.repeat(2);
      if (kind === "palette") return (block.content as BlockContentMap["DRESSCODE"]).palette.map((color, i) => `<span class="wv-swatch" style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${i}`)}></span>`).join("");
      if (kind === "form") return formBody(block, ctx);
      if (["x", "xa", "xi"].includes(kind)) {
        const other = blocks.find(b => tagOf(b) === key);
        const path = rest.join(":");
        if (!other || other.visible === false) return "";
        const oe = editAttrs(other.id, ctx.editable);
        return kind === "x" ? esc(pathValue(other.content, path)) : kind === "xi" ? oe.image(path) : oe.text(path, { multiline: true });
      }
      return "";
    });
    if (block.type === "RSVP_FORM") {
      html = html.replace(/<form\b[^>]*>[\s\S]*?<\/form>/, () => inlineRsvpForm(block));
    }
    if (block.type === "VENUE" && ctx.editable) html = html.replace(/<\/section>$/, `${e.link("mapUrl", pathValue(block.content, "mapUrl"))}</section>`);
    if (ctx.editable) {
      html = html.replace(/data-wv-date=""/g, editAttrs(cover?.id ?? block.id, true).text("dateText"));
    }
    html = html.replace(/<img\b[^>]*\bsrc=""[^>]*>/g, image => {
      if (!ctx.editable) return "";
      const classes = image.match(/\bclass="([^"]*)"/)?.[1] ?? "";
      return image.replace(/\s(?:src|alt|loading|class)="[^"]*"/g, "").replace(/^<img\b/, `<span class="ie-image-placeholder ${classes}"`).replace(/\/?>(?=$)/, `>${gl("Добавить фото", "Add a photo")}</span>`);
    });
    return html;
  }).join("");
}

export function wedwedDocument(opts: { title: string; theme: InviteTheme; body: string; noindex?: boolean; extraCss?: string; script?: string }): string {
  if (!isWedwedTemplate(opts.theme.template)) return "";
  const id = opts.theme.template;
  const styles = ["base", "carousel", "heading-font", "body-font", "design"].map(name => `<link rel="stylesheet" href="/media/invite-${id}/${name}.css">`).join("");
  const sizing = `<script>(function(){function size(){var tablet=innerWidth>500&&innerWidth<=1100;var width=innerWidth<=1100?390:1920;document.documentElement.style.setProperty('--wv-width',width+'px');document.documentElement.style.setProperty('--wv-scale',String((tablet?Math.min(innerWidth,560):innerWidth)/width))}size();addEventListener('resize',size);
// Имена пары — в одну строку каждое и не шире экрана: длинное «Серафина»
// при шрифте образца вылезало за край. Шрифт уменьшается до тех пор, пока
// самое длинное имя не влезет (но не меньше 55% от исходного).
function fit(){document.querySelectorAll('.sm-needtoresize').forEach(function(el){var box=el.closest('.sm-main__names')||el.parentElement;if(!box)return;var spans=el.querySelectorAll(':scope>span');spans.forEach(function(x){x.style.fontSize=''});var start=parseFloat(getComputedStyle(spans[0]||el).fontSize)||0;if(!start)return;var size=start;for(var i=0;i<40;i++){var out=false;spans.forEach(function(x){var r=x.getBoundingClientRect();if(r.right>innerWidth-12||r.left<12)out=true});if(!out||size<=start*.55)break;size-=Math.max(1,start*.03);spans.forEach(function(x){x.style.fontSize=size+'px'})}})}
function later(){fit();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',later);else later();addEventListener('resize',fit)})()</script>`;
  return `<!doctype html><html lang="${opts.theme.language ?? guestLang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${opts.noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}<meta name="theme-color" content="${esc(opts.theme.bg)}"><title>${esc(opts.title)}</title>${styles}<link rel="stylesheet" href="/media/invite-wedwed/runtime.css">${sizing}${opts.extraCss ? `<style>${opts.extraCss}</style>` : ""}</head><body class="${esc(DESIGNS[id].bodyClass)} wv-template" data-wv-template="${id}"><main class="wv-sheet">${opts.body}</main>${opts.script ? `<script>${opts.script}</script>` : ""}</body></html>`;
}
