import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { yandexMapEmbed } from "@/server/guest-html/personalization";
import { L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";

type Context = { eventDate?: Date; timezone: string; rsvp: TiliRsvp | null; editable: boolean };

function numberDate(date: Date | undefined, timezone: string, fallback: string): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat(guestLang() === "en" ? "en-US" : "en-GB", { timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function frame(block: InviteBlockView, type: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="kl-section ${type}"${type === "kl-rsvp" ? ' id="rsvp"' : ""}${e.section()}>${e.tools()}${body}</section>`;
}

function splitNames(value: string): [string, string] {
  const match = value.trim().match(/^(.+?)\s+(?:и|&|and|\+)\s+(.+)$/i);
  return match ? [match[1], match[2]] : [value.trim(), ""];
}

function icon(index: number): string {
  const paths = [
    '<path d="M30 49 15 55l-6-12 17-9M30 49l15 6 6-12-17-9"/><path d="M30 41C15 30 15 19 21 16c4-2 7 1 9 4 2-3 5-6 9-4 6 3 6 14-9 25Z"/>',
    '<circle cx="23" cy="31" r="12"/><circle cx="38" cy="31" r="12"/><path d="m18 18 5-8 5 8M33 18l5-8 5 8"/>',
    '<path d="M10 43h40M14 39h32M18 39c0-14 7-21 12-21s12 7 12 21M30 14v4M25 10c0-3 2-5 2-7M35 10c0-3 2-5 2-7"/>',
    '<path d="M14 16h32v29H14zM18 11h24M20 24h20M20 32h20M24 41h12"/><path d="m25 5 5-3 5 3"/>',
  ];
  return `<svg class="kl-icon" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[index % paths.length]}</svg>`;
}

/**
 * Настоящая карта площадки пары. Раньше здесь была нарисованная схема с
 * местом из образца — у гостя на карте стояла чужая площадка.
 */
function liveMap(blocks: InviteBlockView[], mapUrl: string): string {
  const venue = blocks.find((block) => block.type === "VENUE")?.content as BlockContentMap["VENUE"] | undefined;
  const src = yandexMapEmbed(mapUrl || venue?.mapUrl || "", venue?.name ?? "", venue?.address ?? "");
  return src ? `<div class="kl-map-live" style="position:relative;overflow:hidden;border-radius:1rem;aspect-ratio:16/10;background:#eeece7"><iframe src="${esc(src)}" title="${gl("Карта", "Map")}: ${esc(venue?.name || venue?.address || gl("место торжества", "the venue"))}" loading="lazy" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>` : "";
}


function rsvpForm(block: InviteBlockView, ctx: Context): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const drinks = r ? r.drinks : [
    { id: "demo-red", title: gl("Вино красное", "Red wine") }, { id: "demo-white", title: gl("Вино белое", "White wine") },
    { id: "demo-whisky", title: gl("Виски", "Whisky") }, { id: "demo-vodka", title: gl("Водка", "Vodka") },
    { id: "demo-champagne", title: gl("Шампанское", "Champagne") }, { id: "demo-soft", title: gl("Безалкогольное", "Non-alcoholic") },
  ];
  const action = r?.action ?? "";
  const preserve = r ? [
    ["mealOptionId", r.keep.mealOptionId], ["comment", r.keep.comment],
    ["plusOneName", r.keep.plusOneName], ["plusOneMealOptionId", r.keep.plusOneMealOptionId],
  ].filter((entry): entry is [string, string] => Boolean(entry[1])).map(([name, value]) => `<input type="hidden" name="${name}" value="${esc(value)}">`).join("") +
    r.keep.plusOneDrinkOptionIds.map(id => `<input type="hidden" name="plusOneDrinkOptionIds" value="${esc(id)}">`).join("") : "";
  return frame(block, "kl-rsvp", `<span class="kl-stem"></span><h2${e.text("title")}>${esc(c.title)}</h2><p class="kl-rsvp-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p>
    ${r?.saved ? `<p class="kl-result">${esc(c.successText || gl("Спасибо! Ответ записан.", "Thank you! Your reply has been saved."))}</p>` : ""}${r?.error ? `<p class="kl-error">${gl("Проверьте анкету или срок ответа.", "Please check your answers or the reply deadline.")}</p>` : ""}
    <form class="kl-form" method="post"${action ? ` action="${esc(action)}"` : ' data-demo="true"'}>
      <input type="hidden" name="from" value="invite">${preserve}
      <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || gl("Сможете ли вы присутствовать на торжестве?", "Will you be able to attend?"))}</legend>
        <label><input type="radio" name="status" value="ACCEPTED" required${r?.status === "ACCEPTED" || !r?.saved && r?.status === "PENDING" || !r ? " checked" : ""}> ${esc(c.yesLabel || gl("Я приду / Мы придём", "I’ll be there / We’ll be there"))}</label>
        <label><input type="radio" name="status" value="PENDING"${r?.saved && r.status === "PENDING" ? " checked" : ""}> ${L("kraski.t1", gl("Скажу ответ позже", "I’ll let you know later"))}</label>
        <label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}> ${esc(c.noLabel || gl("Прийти не получится", "Sadly, can’t make it"))}</label>
      </fieldset>
      <label class="kl-field"><span${e.text("nameLabel")}>${esc(c.nameLabel || gl("Имя Фамилия", "Full name"))}</span><small>${L("kraski.t2", gl("Если вы придёте парой или семьёй, укажите все имена и фамилии", "If you’re coming as a couple or family, please list everyone’s full names"))}</small>
        <input name="guestName" type="text" placeholder="${gl("Имена гостей", "Guest names")}" value="${esc(r?.guestName ?? "")}" required maxlength="120"></label>
      ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || gl("Предпочтения по напиткам", "Drink preferences"))}</legend><small>${drinks.length ? gl("Можно выбрать несколько вариантов", "You can choose more than one") : gl("Напитки появятся после настройки бара", "Drinks will appear once the bar is set up")}</small>
        ${drinks.map(drink => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(drink.id)}"${r?.chosenDrinks.includes(drink.id) ? " checked" : ""}> ${esc(drink.title)}</label>`).join("")}
      </fieldset>`}
      ${r?.extraFields ?? ""}<p class="kl-demo-note" hidden>${gl("Ответить можно по именной ссылке из вашего приглашения.", "You can reply using the personal link from your invitation.")}</p>
      <button type="submit">${esc(c.buttonLabel || gl("Отправить", "Send"))}</button>
    </form>`, ctx.editable);
}

export function renderKraskiBlocks(blocks: InviteBlockView[], _theme: InviteTheme, ctx: Context): string {
  const cover = blocks.find(block => block.type === "COVER");
  const coverContent = cover?.content as BlockContentMap["COVER"] | undefined;
  const secondPhoto = coverContent?.photos[0]?.imageUrl || "/media/invite-kraski/couple-sunset.webp";
  const coverEdit = cover ? editAttrs(cover.id, ctx.editable) : null;
  let detailsShown = false;
  return blocks.map((block, position) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        const [first, second] = splitNames(c.names);
        const photo = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Пара у моря", "The couple by the sea")}" fetchpriority="high"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фотографию пары", "Add a photo of the couple")}</span>` : "";
        const date = numberDate(ctx.eventDate, ctx.timezone, c.dateText);
        return frame(block, "kl-cover", `<div class="kl-cover-photo">${photo}</div><div class="kl-cover-copy"><div class="kl-names"${e.text("names", { join: gl(" и ", " & ") })}><span>${esc(first)}</span><i aria-hidden="true">${gl("и", "&")}</i><span>${esc(second)}</span></div>
          <h1${e.text("title")}>${esc(c.title)}</h1><span class="kl-rule"></span><p class="kl-intro"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p><p class="kl-date"${e.text("dateText")}>${esc(date)}</p><p class="kl-after">${L("kraski.t3", gl("Мы будем рады провести этот день вместе с вами.", "We’d be so happy to spend this day with you."))}</p><a class="kl-scroll" href="#program" aria-label="${gl("К программе дня", "To the schedule")}">↓</a></div>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame(block, "kl-program", `<h2 id="program"${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, index) => `<li><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time>${icon(index)}<div><h3${e.text(`items.${index}.title`)}>${esc(item.title)}</h3><p${e.text(`items.${index}.note`)}>${esc(item.note)}</p></div>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? `<button type="button" class="kl-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}`, ctx.editable);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        const until = ctx.eventDate?.getTime() ?? new Date("2027-11-20T12:00:00+03:00").getTime();
        return frame(block, "kl-countdown-section", `<div class="kl-photo-wide"><img src="${esc(secondPhoto)}" alt="" loading="lazy"${coverEdit?.image("photos.0.imageUrl") ?? ""}></div><div class="kl-photo-shade"></div><div class="kl-countdown-copy"><h2${e.text("title")}>${esc(c.title)}</h2><div class="kl-countdown" data-until="${until}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, i) => `<div><strong data-unit="${unit}">00</strong><span>${(guestLang() === "en" ? ["days", "hours", "minutes", "seconds"] : ["дня", "часов", "минут", "секунд"])[i]}</span></div>`).join("")}</div></div>`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return frame(block, "kl-venue", `<span class="kl-stem"></span><h2${e.text("title")}>${esc(c.title)}</h2><p class="kl-venue-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p><p class="kl-venue-name"${e.text("name")}>${esc(c.name)}</p><p class="kl-venue-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p><figure class="kl-venue-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Площадка торжества", "The venue")}" loading="lazy"${e.image("imageUrl")}>` : `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото места", "Add a venue photo")}</span>`}</figure>${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "MAP": {
        const c = block.content as BlockContentMap["MAP"];
        const href = c.yandexUrl || c.googleUrl;
        return frame(block, "kl-map-section", `<div class="kl-map-copy"><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("note", { multiline: true })}>${esc(c.note)}</p></div>${liveMap(blocks, c.yandexUrl)}${href ? `<a class="kl-map-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:1rem;color:inherit">${L("kraski.map.link", gl("Открыть маршрут в Яндекс Картах ↗", "Get directions ↗"))}</a>` : ""}${ctx.editable ? e.link("yandexUrl", c.yandexUrl) : ""}`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        if (position === blocks.length - 1 && !c.tag) {
          const date = numberDate(ctx.eventDate, ctx.timezone, c.text).replaceAll("/", " ✦ ");
          return frame(block, "kl-closing", `<div class="kl-photo-wide"><img src="${esc(secondPhoto)}" alt="" loading="lazy"${coverEdit?.image("photos.0.imageUrl") ?? ""}></div><div class="kl-photo-shade"></div><div class="kl-closing-copy"><p class="kl-closing-date"${e.text("text")}>${esc(date)}</p><h2${e.text("title")}>${esc(c.title)}</h2></div>`, ctx.editable);
        }
        if ((c as { wishlist?: boolean }).wishlist) {
          return frame(block, "kl-detail kl-wishlist", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
        }
        const heading = !detailsShown ? `<h2${e.text("tag")}>${esc(c.tag || gl("Детали", "Details"))}</h2>` : "";
        detailsShown = true;
        return frame(block, "kl-detail", `${heading}<p${e.text("text", { multiline: true })}>${esc(c.text)}</p><span class="kl-tilde" aria-hidden="true">~</span>`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame(block, "kl-dress", `<span class="kl-stem"></span><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="kl-swatches">${c.palette.map((color, index) => `<span style="--paint:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)} aria-label="${gl("Цвет палитры", "Palette color")} ${index + 1}"></span>`).join("")}</div>`, ctx.editable);
      }
      case "RSVP_FORM": return rsvpForm(block, ctx);
      default: return "";
    }
  }).join("");
}
