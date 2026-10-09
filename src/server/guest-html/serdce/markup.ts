import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";
import { localeOf } from "@/lib/i18n";

type Context = { eventDate?: Date; timezone: string; rsvp: TiliRsvp | null; editable: boolean };
/** Служебный тег раздела («История», «Детали»…): у английской свадьбы — его английское имя. */
function tagIs(tag: string | undefined, ru: string, en: string): boolean {
  return tag === ru || (guestLang() === "en" && tag === en);
}
function frame(block: InviteBlockView, type: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="sc-section ${type}"${type.startsWith("sc-rsvp") ? ' id="rsvp"' : ""}${e.section()}>${e.tools()}${body}</section>`;
}
function dateText(date: Date | undefined, zone: string, fallback: string): string {
  return date ? new Intl.DateTimeFormat(localeOf(guestLang()), { timeZone: zone, day: "numeric", month: "long", year: "numeric" }).format(date).replace(/\s?г\.$/, "") : fallback;
}
function story(block: InviteBlockView, photos: InviteBlockView[], texts: InviteBlockView[], cover: InviteBlockView | undefined, ctx: Context): string {
  const coverContent = cover?.content as BlockContentMap["COVER"] | undefined;
  const coverEdit = cover ? editAttrs(cover.id, ctx.editable) : null;
  const entries = photos.flatMap((p) => (p.content as BlockContentMap["PHOTOS"]).items.map((item, index) => ({ item, path: `items.${index}.imageUrl`, id: p.id })));
  const episodeImages = [entries.slice(0, 2), ...entries.slice(2).map((entry) => [entry])];
  const episodes = Array.from({ length: Math.max(texts.length, episodeImages.length) }, (_, episodeIndex) => {
    const text = texts[episodeIndex];
    const content = text?.content as BlockContentMap["TEXT"] | undefined;
    const te = text ? editAttrs(text.id, ctx.editable) : null;
    const pictures = (episodeImages[episodeIndex] ?? []).map(({ item, path, id }, imageIndex) => {
      const ie = editAttrs(id, ctx.editable);
      const ownerTools = id !== block.id && entries.find((entry) => entry.id === id)?.item === item ? `<div class="sc-photo-owner"${ie.section()}>${ie.tools()}</div>` : "";
      return `${ownerTools}<figure class="sc-polaroid sc-rotate-${(episodeIndex + imageIndex) % 4}">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(content?.title || gl("Фото пары", "Photo of the couple"))}" loading="lazy"${ie.image(path)}>` : ctx.editable ? `<span class="ie-image-placeholder"${ie.image(path)}>${gl("Добавить фото", "Add a photo")}</span>` : ""}</figure>`;
    }).join("");
    return `<article class="sc-story-episode sc-episode-${episodeIndex}"${te?.section() ?? ""}>${te?.tools() ?? ""}${pictures ? `<div class="sc-story-photos${episodeIndex === 0 && (episodeImages[0]?.length ?? 0) > 1 ? " paired" : ""}">${pictures}</div>` : ""}${content ? `<div class="sc-story-copy"><h3${te?.text("title") ?? ""}>${esc(content.title)}</h3><p${te?.text("text", { multiline: true }) ?? ""}>${esc(content.text)}</p></div>` : ""}</article>`;
  }).join("");
  return frame(block, "sc-story", `<button class="sc-music-toggle" type="button" aria-label="${gl("Включить музыку", "Play music")}" aria-pressed="false">♪</button><div id="sc-story" class="sc-story-heading"><h2${coverEdit?.text("names") ?? ""}>${esc(coverContent?.names || gl("Наша история", "Our story"))}</h2><p${coverEdit?.text("title") ?? ""}>${esc(coverContent?.title || gl("Приглашение на свадьбу", "Wedding invitation"))}</p></div><p class="sc-story-swipe-hint">${L("serdce.t6", gl("Листайте историю →", "Swipe through our story →"))}</p><div class="sc-story-track">${episodes}</div><p class="sc-story-quote">${L("serdce.t2", gl("В каждой истории есть момент,", "Every story has a moment"))}<br>${L("serdce.t13", gl("после которого всё становится общим.", "after which everything is shared."))}</p><div class="sc-story-arch" aria-hidden="true"><span>♥</span></div><div class="sc-story-invite"><h2>${L("serdce.t10", gl("Родные и друзья!", "Dear family and friends!"))}</h2><p${coverEdit?.text("subtitle", { multiline: true }) ?? ""}>${esc(coverContent?.subtitle || "")}</p><strong>${esc(dateText(ctx.eventDate, ctx.timezone, coverContent?.dateText || ""))}</strong><small${coverEdit?.text("footer") ?? ""}>${esc(coverContent?.footer || gl("С любовью", "With love"))}</small></div>`, ctx.editable);
}
function form(block: InviteBlockView, ctx: Context): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const drinks = r ? r.drinks : [
    { id: "demo-red", title: gl("Вино красное", "Red wine") }, { id: "demo-white", title: gl("Вино белое", "White wine") },
    { id: "demo-whisky", title: gl("Виски", "Whisky") }, { id: "demo-vodka", title: gl("Водка", "Vodka") },
    { id: "demo-sparkling", title: gl("Шампанское", "Champagne") }, { id: "demo-soft", title: gl("Безалкогольное", "Non-alcoholic") },
  ];
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? [hidden("mealOptionId", r.keep.mealOptionId), hidden("comment", r.keep.comment), hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId), ...r.keep.plusOneDrinkOptionIds.map(id => hidden("plusOneDrinkOptionIds", id))].join("") : "";
  const plusOneAllowed = r ? (r as TiliRsvp & { plusOneAllowed?: boolean }).plusOneAllowed ?? true : true;
  return frame(block, "sc-rsvp sc-green", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="sc-rsvp-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${r?.saved ? `<p class="sc-form-ok">${esc(c.successText || gl("Ответ получен", "Reply received"))}</p>` : ""}${r?.error ? `<p class="sc-form-error">${gl("Проверьте анкету или срок ответа.", "Please check your answers or the reply deadline.")}</p>` : ""}<form class="sc-form" method="post"${r?.action ? ` action="${esc(r.action)}"` : ' data-demo="true"'}><input type="hidden" name="from" value="invite">${keep}
    <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || gl("Сможете ли вы присутствовать?", "Will you be able to attend?"))}</legend><label><input type="radio" name="status" value="ACCEPTED" required${!r || r.status === "ACCEPTED" && !r.keep.plusOneName ? " checked" : ""}> ${esc(c.yesLabel || gl("Я приду", "I’ll be there"))}</label><label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}> ${esc(c.noLabel || gl("Прийти не получится", "Sadly, can’t make it"))}</label>${plusOneAllowed ? `<label><input type="radio" name="status" value="ACCEPTED"${r?.status === "ACCEPTED" && r.keep.plusOneName ? " checked" : ""}> ${L("serdce.t1", gl("Буду +1", "Coming with a +1"))}</label>` : ""}</fieldset>
    <label class="sc-field"><span${e.text("nameLabel")}>${esc(c.nameLabel || gl("Имя и фамилия", "Full name"))}</span><small>${L("serdce.t4", gl("Если придёте парой или семьёй, укажите все имена", "If you’re coming as a couple or family, please list all names"))}</small><input type="text" name="guestName" value="${esc(r?.guestName ?? "")}" required placeholder="${gl("Имя и фамилия", "Full name")}" maxlength="120"></label>${plusOneAllowed ? `<label class="sc-field"><span>${L("serdce.t5", gl("Имя спутника", "Your guest’s name"))}</span><input type="text" name="plusOneName" value="${esc(r?.keep.plusOneName ?? "")}" placeholder="${gl("Если придёте вдвоём", "If you’re coming with someone")}" maxlength="120"></label>` : ""}
    ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || gl("Напитки", "Drinks"))}</legend><small>${L("serdce.t7", gl("Можно выбрать несколько вариантов", "You can choose more than one"))}</small>${drinks.map(d => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(d.id)}"${r?.chosenDrinks.includes(d.id) ? " checked" : ""}> ${esc(d.title)}</label>`).join("")}</fieldset>`}${r?.extraFields ?? ""}<p class="sc-demo-note" hidden>${gl("Ответить можно по именной ссылке из вашего приглашения.", "You can reply using the personal link from your invitation.")}</p><button type="submit">${esc(c.buttonLabel || gl("Отправить", "Send"))}</button></form>`, ctx.editable);
}

export function renderSerdceBlocks(blocks: InviteBlockView[], _theme: InviteTheme, ctx: Context): string {
  const cover = blocks.find(b => b.type === "COVER");
  const photos = blocks.filter(b => b.type === "PHOTOS" && !tagIs((b.content as BlockContentMap["PHOTOS"]).tag, "Дресс-код", "Dress code"));
  const storyTexts = blocks.filter(b => b.type === "TEXT" && tagIs((b.content as BlockContentMap["TEXT"]).tag, "История", "Story"));
  let details = 0;
  return blocks.map((block, position) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        return frame(block, "sc-cover", `${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Пара в поле", "The couple in a field")}" fetchpriority="high"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото пары", "Add a photo of the couple")}</span>` : ""}<div class="sc-cover-shade"></div><div class="sc-cover-copy"><h1${e.text("names")}>${esc(c.names)}</h1><p${e.text("title")}>${esc(c.title)}</p><a href="#sc-story">${L("serdce.t9", gl("Открыть приглашение", "Open the invitation"))}</a></div>`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        if (tagIs(c.tag, "Дресс-код", "Dress code")) return frame(block, "sc-dress-men", `<h3${e.text("title")}>— ${esc(c.title)}</h3>${c.items.map((item, index) => item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption || gl("Мужские образы", "Outfit ideas for men"))}" loading="lazy"${e.image(`items.${index}.imageUrl`)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>${gl("Добавить образ", "Add an outfit")}</span>` : "").join("")}`, ctx.editable);
        return block.id === photos[0]?.id ? story(block, photos, storyTexts, cover, ctx) : "";
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        if (tagIs(c.tag, "История", "Story")) return "";
        if (tagIs(c.tag, "Детали", "Details")) {
          const heading = details++ === 0 ? `<h2>${L("serdce.t3", gl("Детали", "Details"))}</h2>` : "";
          return frame(block, "sc-detail sc-green", `${heading}<div class="sc-detail-body"><h3${e.text("title")}>— ${esc(c.title)}</h3><p${e.text("text", { multiline: true })}>${esc(c.text)}</p></div>${details === 3 ? `<p class="sc-detail-quote">${L("serdce.t12", gl("Ты рядом — и этот мир становится теплее.", "With you by my side, the world feels warmer."))}</p>` : ""}`, ctx.editable);
        }
        if (tagIs(c.tag, "Контакты", "Contacts")) return frame(block, "sc-contact", `<h2${e.text("tag")}>${esc(c.tag)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><a href="tel:${esc(c.text.match(/\+\d[\d ()-]+/)?.[0]?.replace(/[^\d+]/g, "") ?? "")}">${esc(c.title)} · ${esc(c.text.match(/\+\d[\d ()-]+/)?.[0] ?? "")}</a>`, ctx.editable);
        if (position === blocks.length - 1) return frame(block, "sc-farewell", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text")}>${esc(c.text)}</p>`, ctx.editable);
        return frame(block, "sc-text", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame(block, "sc-program sc-green", `<h2${e.text("title")}>${esc(c.title)}</h2><div class="sc-program-list">${c.items.map((item, index) => `<article><h3><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time> <span${e.text(`items.${index}.title`)}>${esc(item.title)}</span></h3><p${e.text(`items.${index}.note`)}>${esc(item.note)}</p>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</article>`).join("")}</div>${ctx.editable ? `<button type="button" class="sc-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return frame(block, "sc-venue", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="sc-venue-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p><h3${e.text("name")}>${esc(c.name)}</h3><p${e.text("address")}>${esc(c.address)}</p>${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Площадка торжества", "The venue")}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото площадки", "Add a venue photo")}</span>` : ""}${c.mapUrl ? `<a class="sc-map-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.mapLabel || gl("Открыть карту", "Open map"))} ↗</a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "MAP": {
        const c = block.content as BlockContentMap["MAP"];
        return frame(block, "sc-map-section", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.yandexUrl || c.googleUrl ? `<a href="${esc(c.yandexUrl || c.googleUrl)}" target="_blank" rel="noopener noreferrer">${L("serdce.t8", gl("Открыть маршрут ↗", "Get directions ↗"))}</a>` : ""}${ctx.editable ? e.link("yandexUrl", c.yandexUrl) : ""}`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame(block, "sc-dress", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="sc-swatches">${c.palette.map((color, index) => `<span style="background:${esc(color)}"${e.color(`palette.${index}`)} aria-label="${gl("Цвет", "Color")} ${index + 1}"></span>`).join("")}</div><h3>${L("serdce.t15", gl("— Девушки", "— For her"))}</h3>${c.imageUrl ? `<img class="sc-dress-image" src="${esc(c.imageUrl)}" alt="${gl("Образы для гостей", "Outfit ideas for guests")}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить примеры нарядов", "Add outfit examples")}</span>` : ""}`, ctx.editable);
      }
      case "RSVP_FORM": return form(block, ctx);
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        const until = ctx.eventDate?.getTime() ?? new Date("2027-11-20T13:00:00Z").getTime();
        return frame(block, "sc-countdown", `<h2${e.text("title")}>${esc(c.title)}</h2><div class="sc-clock" data-until="${until}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, index) => `<div><strong data-unit="${unit}">00</strong><span>${(guestLang() === "en" ? ["Days", "Hours", "Min", "Sec"] : ["Дни", "Часы", "Мин", "Сек"])[index]}</span></div>`).join("")}</div><p class="sc-quote">${L("serdce.t11", gl("Ты моя любовь,", "You are my love,"))}<br>${L("serdce.t14", gl("ты всё, что мне надо", "you’re all I need"))}</p>`, ctx.editable);
      }
      default: return "";
    }
  }).join("");
}
