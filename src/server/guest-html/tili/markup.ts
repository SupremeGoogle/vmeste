/**
 * Разметка шаблона «Тили-тесто» — страница из репозитория-образца
 * (SupremeGoogle/wedding, `index.html`), собранная из разделов приглашения.
 *
 * Разделы образца лягут на наши блоки один в один: гирлянда, считалка,
 * детские фото и имена — обложка; два фото пары — фотографии; «Когда» —
 * календарь; отсчёт; «Локация» — место; тайминг; дресс-код; пожелания —
 * текст; анкета — форма ответа. Поэтому организатор может скрыть или
 * переставить любой раздел, а данные не живут отдельно от остального
 * продукта: дата — это дата мероприятия, напитки — список бара, ответы
 * падают во вкладку «Ответы».
 *
 * Видео-заставки и квеста жениха нет: вместо видео — конверт, по нажатию
 * на который открывается приглашение и включается музыка.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";
import { L } from "@/server/guest-html/template-labels";
import { editAttrs, type EditAttrs } from "@/server/guest-html/inline-editor";
import { TILI_ENVELOPE } from "@/lib/invite-templates/tili-assets";

/** Анкета прямо на странице: кто отвечает и что уже ответил. */
export type TiliRsvp = {
  /** Куда отправлять форму; без именной ссылки анкета только показывается. */
  action: string | null;
  guestName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  drinks: { id: string; title: string }[];
  chosenDrinks: string[];
  musicWish: string;
  /** Поля стандартной формы ответа, которых в этой анкете нет: их нельзя стереть. */
  keep: {
    mealOptionId: string | null;
    comment: string;
    plusOneName: string;
    plusOneMealOptionId: string | null;
    plusOneDrinkOptionIds: string[];
  };
  saved: boolean;
  error: string | null;
  /** Поля конструктора анкеты (`rsvpFieldsHtml`) — перед кнопкой отправки. */
  extraFields?: string;
  /** Что именно не так с ответом — для общей анкеты (`inline-rsvp-form.ts`). */
  errorText?: string;
  /** Только вопросы конструктора, без строки ошибки. */
  questionFields?: string;
  /** Организатор убрал из анкеты «Что будете пить». */
  drinksHidden?: boolean;
};

export type TiliContext = {
  eventDate?: Date;
  timezone: string;
  rsvp: TiliRsvp | null;
  editable: boolean;
};

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

/** Части даты на площадке: календарь и большая дата — по её времени, а не сервера. */
function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Текст с переносами: абзацы через пустую строку, строки — через <br>. */
function lines(text: string): string {
  return esc(text).replace(/\n/g, "<br>");
}

function tag(text: string, e: EditAttrs, className = "section-tag"): string {
  if (!text.trim() && !e.enabled) return "";
  return `<div class="${className} reveal"${e.text("tag")}>${esc(text)}</div>`;
}

function img(src: string, alt: string, attrs: string, extra = ""): string {
  if (!src) return attrs.includes("data-image-edit") ? `<span class="ie-image-placeholder"${attrs}>Добавить фотографию</span>` : "";
  return `<img src="${esc(src)}" alt="${esc(alt)}"${attrs}${extra}>`;
}

function splitNames(names: string): [string, string] {
  const match = names.trim().match(/^(.+?)\s+(?:и|&|and|\+)\s+(.+)$/i);
  return match ? [match[1], match[2]] : [names.trim(), ""];
}

function cover(block: InviteBlockView, e: EditAttrs): string {
  const c = block.content as BlockContentMap["COVER"];
  const [first, second] = splitNames(c.names);
  const photos = [0, 1].map((index) => c.photos[index] ?? { imageUrl: "", caption: "" });
  const intro = c.subtitle.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const side = ["polaroid-left", "polaroid-right"];

  return `<section class="hero" id="hero"${e.section()}>${e.tools()}
<div class="bunting" aria-hidden="true"><div class="bunting-rope"></div>${
    Array.from({ length: 9 }, (_, index) => `<span class="flag f${index + 1}"></span>`).join("")
  }</div>
${c.title.trim() || e.enabled ? `<p class="hero-rhyme fade-in-hero"${e.text("title")}>${esc(c.title)}</p>` : ""}
${!c.photos.length ? `<div class="polaroids fade-in-hero delay-1"><div class="polaroid"><div class="polaroid-img">${img(c.imageUrl, "Наша фотография", e.image("imageUrl"))}</div></div></div>` : `<div class="polaroids fade-in-hero delay-1">${photos
    .map((photo, index) =>
      photo.imageUrl || e.enabled
        ? `<div class="polaroid ${side[index]}"><div class="polaroid-img">${img(
            photo.imageUrl, "", e.image(`photos.${index}.imageUrl`), index === 0 ? ' fetchpriority="high" decoding="async"' : ' decoding="async"',
          )}</div><p class="polaroid-caption"${e.text(`photos.${index}.caption`, { multiline: true })}>${lines(photo.caption)}</p></div>`
        : "",
    )
    .join("")}</div>`}
${intro.length > 0 || e.enabled
    ? `<div class="hero-intro-text fade-in-hero delay-2"${e.text("subtitle", { multiline: true })}>${intro
        .map((line, index) => `<p${index === 0 ? ' class="intro-ital"' : ""}>${esc(line)}</p>`)
        .join("")}</div>`
    : ""}
<div class="hero-names fade-in-hero delay-3"${e.text("names", { join: " и " })}><div class="hero-name"><span class="name-cap">${esc(first)}</span></div>${
    second ? `<div class="hero-name hero-name-right"><span class="name-cap">${esc(second)}</span></div>` : ""
  }</div>
</section>`;
}

function photos(block: InviteBlockView, e: EditAttrs): string {
  const c = block.content as BlockContentMap["PHOTOS"];
  const items = e.enabled
    ? Array.from({ length: Math.min(4, Math.max(2, c.items.length + 1)) }, (_, index) => c.items[index] ?? { imageUrl: "", caption: "" })
    : c.items.filter((item) => item.imageUrl);
  if (items.length === 0) return "";
  const cls = ["polaroid msg-pol-1", "polaroid msg-pol-2 msg-main-photo", "polaroid msg-pol-1", "polaroid msg-pol-2"];
  return `<section class="message-section reveal"${e.section()}>${e.tools()}<div class="msg-polaroids">${items
    .map(
      (item, index) =>
        `<div class="${cls[index]}"><div class="polaroid-img">${img(item.imageUrl, "", e.image(`items.${index}.imageUrl`), ' loading="lazy" decoding="async"')}</div><p class="polaroid-caption"${e.text(`items.${index}.caption`)}>${esc(item.caption)}</p>${e.enabled ? "" : '<canvas class="msg-canvas"></canvas>'}</div>`,
    )
    .join("")}</div></section>`;
}

function calendar(block: InviteBlockView, e: EditAttrs, ctx: TiliContext): string {
  const c = block.content as BlockContentMap["CALENDAR"];
  if (!ctx.eventDate) return "";
  const { year, month, day } = localParts(ctx.eventDate, ctx.timezone);
  // Понедельник первым, как в образце.
  const shift = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [
    ...["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((name) => `<div class="dn">${name}</div>`),
    ...Array.from({ length: shift }, () => '<div class="d d-empty"></div>'),
    ...Array.from({ length: days }, (_, index) =>
      `<div class="d${index + 1 === day ? " d-marked" : ""}">${index + 1}</div>`,
    ),
  ].join("");
  const big = `${String(day).padStart(2, "0")} / ${String(month).padStart(2, "0")} / ${String(year).slice(-2)}`;

  return `<section class="calendar-section" id="when"${e.section()}>${e.tools()}${tag(c.tag, e)}
<div class="cal-card reveal"><h2 class="cal-title"${e.text("title")}>${esc(c.title)}</h2><div class="cal-month">${MONTHS[month - 1]} ${year}</div><div class="cal-grid">${cells}</div>${
    c.message.trim() || e.enabled ? `<p class="cal-message"${e.text("message", { multiline: true })}>${lines(c.message)}</p>` : ""
  }</div>
<div class="big-date-wrap reveal"><div class="big-date">${big}</div></div></section>`;
}

function countdown(block: InviteBlockView, e: EditAttrs, ctx: TiliContext): string {
  const c = block.content as BlockContentMap["COUNTDOWN"];
  if (!ctx.eventDate) return "";
  const unit = (id: string, label: string) =>
    `<div class="cd-item"><span class="cd-num" data-cd="${id}">00</span><span class="cd-unit">${label}</span></div>`;
  return `<section class="countdown-section reveal"${e.section()}>${e.tools()}<p class="countdown-label"${e.text("title")}>${esc(c.title)}</p><div class="countdown" id="countdown" data-target="${ctx.eventDate.toISOString()}" data-done="${esc(c.doneText)}">${unit("days", "дней")}<span class="cd-colon">:</span>${unit("hours", "часов")}<span class="cd-colon">:</span>${unit("mins", "минут")}<span class="cd-colon">:</span>${unit("secs", "секунд")}</div>${
    e.enabled ? `<p class="cd-unit" style="margin-top:18px">Когда день наступит: <span${e.text("doneText")}>${esc(c.doneText)}</span></p>` : ""
  }</section>`;
}

function venue(block: InviteBlockView, e: EditAttrs): string {
  const c = block.content as BlockContentMap["VENUE"];
  return `<section class="location-section" id="location"${e.section()}>${e.tools()}${tag(c.tag, e)}
<div class="loc-card reveal">${c.imageUrl || e.enabled ? `<div class="loc-img-wrap">${img(c.imageUrl, c.name, e.image("imageUrl"), ' class="loc-photo" loading="lazy" decoding="async"')}</div>` : ""}
<div class="loc-detail"><p class="loc-type"${e.text("title")}>${esc(c.title)}</p><p class="loc-name"${e.text("name")}>${esc(c.name)}</p><p class="loc-addr"${e.text("address", { multiline: true })}>${esc(c.address)}</p>${
    c.note.trim() || e.enabled ? `<p class="loc-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p>` : ""
  }${
    c.mapUrl || e.enabled
      ? `<a class="map-btn" href="${esc(c.mapUrl || "#")}" target="_blank" rel="noopener"><span${e.text("mapLabel")}>${esc(c.mapLabel || "посмотреть на карте")}</span></a>${e.enabled ? `<div>${e.link("mapUrl", c.mapUrl)}</div>` : ""}`
      : ""
  }</div></div></section>`;
}

function mapBlock(block: InviteBlockView, e: EditAttrs): string {
  const c = block.content as BlockContentMap["MAP"];
  const links = [
    c.yandexUrl ? `<a class="map-btn" href="${esc(c.yandexUrl)}" target="_blank" rel="noopener">${L("tili.t2", "Яндекс Карты")}</a>` : "",
    c.googleUrl ? `<a class="map-btn" href="${esc(c.googleUrl)}" target="_blank" rel="noopener">Google Maps</a>` : "",
  ].filter(Boolean);
  return `<section class="location-section"${e.section()}>${e.tools()}<div class="section-tag reveal"${e.text("title")}>${esc(c.title)}</div>${
    c.note.trim() || e.enabled ? `<p class="dc-text reveal"${e.text("note", { multiline: true })}>${esc(c.note)}</p>` : ""
  }<div class="reveal" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">${links.join("")}</div>${
    e.enabled ? `<div>${e.link("yandexUrl", c.yandexUrl)} ${e.link("googleUrl", c.googleUrl)}</div>` : ""
  }</section>`;
}

function timeline(block: InviteBlockView, e: EditAttrs): string {
  const c = block.content as BlockContentMap["TIMELINE"];
  return `<section class="timing-section" id="timing"${e.section()}>${e.tools()}${tag(c.tag, e)}<h2 class="timing-title reveal"${e.text("title")}>${esc(c.title)}</h2><div class="timeline">${c.items
    .map(
      (item, index) =>
        `<div class="tl-item reveal${index === c.items.length - 1 ? " tl-finale" : ""}">${
          item.icon || e.enabled ? `<div class="tl-icon">${img(item.icon, item.title, e.image(`items.${index}.icon`), ' class="tl-img" loading="lazy"')}</div>` : ""
        }<div class="tl-time"${e.text(`items.${index}.time`)}>${esc(item.time)}</div><p class="tl-label"${e.text(`items.${index}.title`)}>${esc(item.title)}</p>${
          item.note.trim() || e.enabled ? `<p class="tl-note"${e.text(`items.${index}.note`)}>${esc(item.note)}</p>` : ""
        }${e.enabled ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить деталь">×</button>` : ""}</div>`,
    )
    .join("")}</div>${e.enabled ? '<button type="button" class="map-btn" data-block-action="add-detail">+ Добавить деталь дня</button>' : ""}</section>`;
}

function dresscode(block: InviteBlockView, e: EditAttrs): string {
  const c = block.content as BlockContentMap["DRESSCODE"];
  return `<section class="dresscode-section" id="dresscode"${e.section()}>${e.tools()}${
    c.title.trim() || e.enabled ? `<p class="dc-cursive reveal"${e.text("title")}>${esc(c.title)}</p>` : ""
  }${tag(c.tag, e)}${c.text.trim() || e.enabled ? `<p class="dc-text reveal"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` : ""}
<div class="dc-swatches reveal">${c.palette
    .map((color, index) => `<div class="swatch" style="background:${color}" data-color="${color}"${e.color(`palette.${index}`)}></div>`)
    .join("")}</div>${
    c.imageUrl || e.enabled
      ? `<div class="dc-reference reveal">${img(c.imageUrl, "Примеры нарядов", e.image("imageUrl"), ' class="dc-ref-img" loading="lazy" decoding="async"')}</div>`
      : ""
  }</section>`;
}

function text(block: InviteBlockView, e: EditAttrs): string {
  const c = block.content as BlockContentMap["TEXT"];
  const paragraphs = c.text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return `<section class="wishes-section" id="wishes"${e.section()}>${e.tools()}${tag(c.tag, e)}<div class="wishes-static reveal">${
    c.title.trim() || e.enabled ? `<p class="ws-title"${e.text("title")}>${esc(c.title)}</p>` : ""
  }<div class="wishes-body"${e.text("text", { multiline: true })}>${paragraphs
    .map((part) => `<p class="ws-text">${lines(part)}</p>`)
    .join("")}</div></div></section>`;
}

const RSVP_DEFAULTS = {
  nameLabel: "Ваше имя и фамилия",
  attendanceLabel: "Ваше присутствие",
  yesLabel: "Обязательно приду 🎉",
  noLabel: "К сожалению, не смогу 😔",
  drinksLabel: "Предпочтения в напитках",
  musicLabel: "Какую музыку предпочитаете?",
  musicPlaceholder: "Валерий Меладзе",
  successText: "Спасибо! Ваши ответы получены.\nМы очень ждём встречи с вами!",
};

const RSVP_ERRORS: Record<string, string> = {
  deadline: "Срок ответа истёк. Напишите организатору — он отметит вас вручную.",
  invalid: "Проверьте заполнение анкеты.",
  gone: "Приглашение больше не действует.",
};

function rsvpForm(block: InviteBlockView, e: EditAttrs, ctx: TiliContext): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const label = (key: keyof typeof RSVP_DEFAULTS) => c[key] || RSVP_DEFAULTS[key];
  const r = ctx.rsvp;
  const answered = r && r.status !== "PENDING";
  const showSuccess = Boolean(r?.saved) && !e.enabled;
  const hidden = (name: string, value: string | null) =>
    value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const drinks = r?.drinks ?? [];

  const form = `<form class="rsvp-form reveal" id="rsvpForm" method="post"${r?.action ? ` action="${esc(r.action)}"` : ""}${
    showSuccess ? ' style="display:none"' : ""
  }${r?.action ? "" : ' data-no-link="1"'}>
<input type="hidden" name="from" value="invite">${
    r ? [
      hidden("mealOptionId", r.keep.mealOptionId),
      hidden("comment", r.keep.comment),
      hidden("plusOneName", r.keep.plusOneName),
      hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId),
      ...r.keep.plusOneDrinkOptionIds.map((id) => hidden("plusOneDrinkOptionIds", id)),
    ].join("") : ""
  }
<div class="fg"><label class="fl" for="guestName"${e.text("nameLabel")}>${esc(label("nameLabel"))}</label><input class="fi" type="text" id="guestName" name="guestName" placeholder="Иван Петров"${
    ` value="${esc(r?.guestName ?? "")}" required`
  }></div>
<div class="fg"><span class="fl"${e.text("attendanceLabel")}>${esc(label("attendanceLabel"))}</span><div class="radio-group">
<label class="rl"><input type="radio" name="status" value="ACCEPTED" required${r?.status === "ACCEPTED" ? " checked" : ""}><span class="rc"></span><span${e.text("yesLabel")}>${esc(label("yesLabel"))}</span></label>
<label class="rl"><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}><span class="rc"></span><span${e.text("noLabel")}>${esc(label("noLabel"))}</span></label>
</div></div>${
    !r?.drinksHidden && (drinks.length > 0 || e.enabled)
      ? `<div class="fg"><span class="fl"${e.text("drinksLabel")}>${esc(label("drinksLabel"))}</span><div class="check-group">${
          drinks.length > 0
            ? drinks
                .map((drink) => `<label class="cl"><input type="checkbox" name="drinkOptionIds" value="${esc(drink.id)}"${
                  r?.chosenDrinks.includes(drink.id) ? " checked" : ""
                }><span class="cc"></span>${esc(drink.title)}</label>`)
                .join("")
            : '<span class="rsvp-note">Напитки берутся из раздела «Бар» в настройках мероприятия.</span>'
        }</div></div>`
      : ""
  }
<div class="fg"><label class="fl" for="music"${e.text("musicLabel")}>${esc(label("musicLabel"))}</label><input class="fi" type="text" id="music" name="musicWish" maxlength="200" placeholder="${esc(label("musicPlaceholder"))}" value="${esc(r?.musicWish ?? "")}">${
    e.enabled ? `<span class="rsvp-note">Подсказка в поле: <span${e.text("musicPlaceholder")}>${esc(label("musicPlaceholder"))}</span></span>` : ""
  }</div>
${r?.error ? `<p class="rsvp-note" role="alert">${esc(r.errorText ?? RSVP_ERRORS[r.error] ?? RSVP_ERRORS.invalid)}</p>` : ""}
${r?.questionFields ?? r?.extraFields ?? ""}
<p class="rsvp-note" id="rsvpNoLink" hidden>Ответить можно по именной ссылке из вашего приглашения.</p>
<button class="submit-btn" type="submit" id="submitBtn"><span${e.text("buttonLabel")}>${esc(answered ? "Изменить ответ" : c.buttonLabel)}</span></button>
</form>`;

  return `<section class="rsvp-section" id="rsvp"${e.section()}>${e.tools()}${tag(c.tag, e)}${
    c.title.trim() || e.enabled ? `<p class="rsvp-intro reveal"${e.text("title")}>${esc(c.title)}</p>` : ""
  }${c.text.trim() || e.enabled ? `<p class="rsvp-sub reveal"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` : ""}${form}
<div class="rsvp-success${showSuccess ? " show" : ""}" id="rsvpSuccess"><div class="success-emoji">🎊</div><p${e.text("successText", { multiline: true })}>${esc(label("successText"))}</p>${
    showSuccess ? `<button type="button" class="rsvp-again" id="rsvpAgain">${L("tili.t1", "Изменить ответ")}</button>` : ""
  }</div>${e.enabled ? `<p class="rsvp-note">Текст после отправки: <span${e.text("successText", { multiline: true })}>${esc(label("successText"))}</span></p>` : ""}</section>`;
}

function renderBlock(block: InviteBlockView, ctx: TiliContext): string {
  const e = editAttrs(block.id, ctx.editable);
  switch (block.type) {
    case "COVER": return cover(block, e);
    case "PHOTOS": return photos(block, e);
    case "CALENDAR": return calendar(block, e, ctx);
    case "COUNTDOWN": return countdown(block, e, ctx);
    case "VENUE": return venue(block, e);
    case "MAP": return mapBlock(block, e);
    case "TIMELINE": return timeline(block, e);
    case "DRESSCODE": return dresscode(block, e);
    case "TEXT": return text(block, e);
    case "RSVP_FORM": return rsvpForm(block, e, ctx);
    // Виш-лист рисуется общим рендером поверх шаблона (см. invite-html).
    default: return "";
  }
}

export function renderTiliBlocks(blocks: InviteBlockView[], theme: InviteTheme, ctx: TiliContext): string {
  const coverBlock = blocks.find((block) => block.type === "COVER");
  const coverContent = coverBlock?.content as BlockContentMap["COVER"] | undefined;
  const names = coverContent ? splitNames(coverContent.names).filter(Boolean).join(" & ") : "";
  // Имена на конверте — текстом поверх картинки, а не частью рисунка:
  // так на конверте стоят имена этой пары, а не пары из образца.
  const [envelopeFirst, envelopeSecond] = coverContent ? splitNames(coverContent.names) : ["", ""];
  const footerEdit = coverBlock ? editAttrs(coverBlock.id, ctx.editable) : editAttrs("", false);

  const envelope = ctx.editable
    ? ""
    : `<div class="cover" id="cover" role="button" tabindex="0" aria-label="Открыть приглашение"><div class="cover-inner"><div class="cover-env"><img class="cover-envelope" src="${TILI_ENVELOPE}" alt="" fetchpriority="high"><span class="cover-names" aria-hidden="true">${esc(envelopeFirst)}${envelopeSecond ? `<br>${esc(envelopeSecond)}` : ""}</span></div><p class="cover-hint">${L("tili.t3", "нажмите, чтобы открыть")}</p></div></div>`;

  const music = theme.musicUrl
    ? `<audio id="weddingMusic" src="${esc(theme.musicUrl)}" preload="none" loop></audio><button class="music-toggle" id="musicToggle" type="button" aria-label="Музыка"><span>🎵</span></button>`
    : "";

  return `${envelope}<div class="main-content" id="mainContent">
${Array.from({ length: 6 }, (_, index) => `<div class="leaf leaf-${index + 1}" aria-hidden="true"></div>`).join("")}
${blocks.map((block) => renderBlock(block, ctx)).join("")}
${coverContent
    ? `<footer class="site-footer"><p class="footer-love"${footerEdit.text("footer")}>${esc(coverContent.footer || (ctx.editable ? "" : ""))}</p><p class="footer-names">${esc(names)}</p></footer>`
    : ""}
</div>${music}`;
}
