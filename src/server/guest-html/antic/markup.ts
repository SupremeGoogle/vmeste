import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { yandexMapEmbed } from "@/server/guest-html/personalization";
import { L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";
import { localeOf } from "@/lib/i18n";

type Context = { eventDate?: Date; timezone: string; rsvp: TiliRsvp | null; editable: boolean };
const svg = (body: string, cls = "") => `<svg class="${cls}" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
function frame(block: InviteBlockView, cls: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="ac-section ${cls}"${cls === "ac-rsvp" ? ' id="rsvp"' : ""}${e.section()}>${e.tools()}${body}</section>`;
}
function rings(): string { return svg('<circle cx="48" cy="67" r="26"/><circle cx="75" cy="67" r="26"/><path d="M31 34l17-15 17 15-17 9zM48 19v24M32 34h32"/>', "ac-rings"); }
function cake(): string {
  return `<svg class="ac-cake" viewBox="0 0 420 290" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M62 250h296m-280 0 10-53h244l10 53M95 197c-13-14-4-25 13-19 18 7 20 18 37 8 14-9 26-13 40-3 20 14 37 11 52 0 17-12 32-6 46 4 17 11 23-3 40-8 17-6 23 7 10 18M122 177l8-54h160l8 54M130 122c-9-13-2-22 13-17 14 4 18 15 32 8 15-8 19-10 33-2 16 9 25 7 38-1 13-8 22-6 30 2 13 11 18-7 28-7 11 1 15 9 7 18M163 104l5-43h85l5 43M210 60V33m-9-1c-6-8-2-16 7-19 1 11 6 11 5 19m-4 0h3M164 62c-24-13-37-12-43-1-6 11 11 18 43 15m92-14c24-13 37-12 43-1 6 11-11 18-43 15M82 196c-24-15-43-15-50-4-8 13 9 26 48 26m261-22c24-15 43-15 50-4 8 13-9 26-48 26M182 69c15 10 42 10 56 0M117 133c49 18 141 18 185 0M86 207c76 23 177 23 248 0"/></svg>`;
}
function programIcon(index: number): string {
  const art = [
    '<path d="M60 106s-32-35-32-60a32 32 0 0 1 64 0c0 25-32 60-32 60Z"/><path d="M60 60c-15-11-15-22-7-24 4-1 6 1 7 4 2-3 4-5 8-4 8 2 8 13-8 24Z"/>',
    '<circle cx="44" cy="58" r="24"/><circle cx="75" cy="58" r="24"/><path d="m33 31 11-13 11 13m9 0 11-13 11 13M35 98h48"/>',
    '<path d="M15 85h90M24 79h72M30 76c0-22 13-39 30-39s30 17 30 39M60 27v9M51 25h18M38 96h44"/>',
    '<path d="M25 27h70v60H25zM35 40h50M35 73h50M45 54l30 12m0-12L45 66M40 97h40"/>',
  ];
  return svg(art[index % art.length], "ac-program-icon");
}
/**
 * Настоящая карта площадки пары. Раньше здесь была нарисованная схема с
 * местом из образца — у гостя на карте стояла чужая площадка.
 */
function liveMap(blocks: InviteBlockView[], mapUrl: string): string {
  const venue = blocks.find((block) => block.type === "VENUE")?.content as BlockContentMap["VENUE"] | undefined;
  const src = yandexMapEmbed(mapUrl || venue?.mapUrl || "", venue?.name ?? "", venue?.address ?? "");
  return src ? `<div class="ac-map-live" style="position:relative;overflow:hidden;border-radius:1rem;aspect-ratio:16/10;background:#eeece7"><iframe src="${esc(src)}" title="${gl("Карта", "Map")}: ${esc(venue?.name || venue?.address || gl("место торжества", "wedding venue"))}" loading="lazy" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>` : "";
}

function dateText(date: Date | undefined, zone: string, fallback: string): string {
  return date ? new Intl.DateTimeFormat(localeOf(guestLang()), { timeZone: zone, day: "numeric", month: "long", year: "numeric" }).format(date).replace(/\s?г\.$/, "") : fallback;
}
function form(block: InviteBlockView, ctx: Context): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const drinks = r ? r.drinks : (guestLang() === "en" ? ["Red wine", "White wine", "Whisky", "Vodka", "Champagne", "Non-alcoholic"] : ["Вино красное", "Вино белое", "Виски", "Водка", "Шампанское", "Безалкогольное"]).map((title, i) => ({ id: `demo-${i}`, title }));
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? [hidden("mealOptionId", r.keep.mealOptionId), hidden("comment", r.keep.comment), hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId), ...r.keep.plusOneDrinkOptionIds.map(id => hidden("plusOneDrinkOptionIds", id))].join("") : "";
  const plusAllowed = r ? (r as TiliRsvp & { plusOneAllowed?: boolean }).plusOneAllowed ?? true : true;
  return frame(block, "ac-rsvp", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="ac-rsvp-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${r?.saved ? `<p class="ac-form-result">${esc(c.successText || gl("Ответ получен", "Reply received"))}</p>` : ""}${r?.error ? `<p class="ac-form-error">${gl("Проверьте анкету или срок ответа.", "Please check your answers or the reply deadline.")}</p>` : ""}<form class="ac-form" method="post"${r?.action ? ` action="${esc(r.action)}"` : ' data-demo="true"'}><input type="hidden" name="from" value="invite">${keep}
  <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel)}</legend><label><input type="radio" name="status" value="ACCEPTED" required${!r || r.status === "ACCEPTED" ? " checked" : ""}>${esc(c.yesLabel)}</label><label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}>${esc(c.noLabel)}</label>${plusAllowed ? `<label><input type="checkbox" name="acPlusOne" value="yes"${r?.keep.plusOneName ? " checked" : ""}>${L("antic.t1", gl("Буду +1", "I’m bringing a guest"))}</label><label class="ac-plus-name"><span>${L("antic.t2", gl("Имя спутника", "Guest’s name"))}</span><input name="plusOneName" type="text" value="${esc(r?.keep.plusOneName ?? "")}" placeholder="${gl("Имя и фамилия", "Full name")}" maxlength="120"></label>` : ""}</fieldset>
  <label class="ac-name"><span${e.text("nameLabel")}>${esc(c.nameLabel)}</span><input type="text" name="guestName" value="${esc(r?.guestName ?? "")}" placeholder="${gl("Ваше имя", "Your name")}" maxlength="120" required></label>
  ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel)}</legend><small>${L("antic.t3", gl("Можно выбрать несколько вариантов", "Choose as many as you like"))}</small>${drinks.map(d => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(d.id)}"${r?.chosenDrinks.includes(d.id) ? " checked" : ""}>${esc(d.title)}</label>`).join("")}</fieldset>`}${r?.extraFields ?? ""}<p class="ac-demo-note" hidden>${gl("Ответить можно по именной ссылке из приглашения.", "You can reply using the personal link from your invitation.")}</p><button type="submit">${esc(c.buttonLabel)}</button></form>`, ctx.editable);
}
export function renderAnticBlocks(blocks: InviteBlockView[], ctx: Context): string {
  let details = false;
  return blocks.map((block, position) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        const coverPhoto = c.photos?.[0]?.imageUrl || c.imageUrl;
        const coverPhotoField = c.photos?.[0] ? "photos.0.imageUrl" : "imageUrl";
        return frame(block, "ac-cover", `<div class="ac-cover-center">${coverPhoto ? `<img class="ac-cover-photo" src="${esc(coverPhoto)}" alt="${gl("Свадебный портрет", "Wedding portrait")}" fetchpriority="high"${e.image(coverPhotoField)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото на обложку", "Add a cover photo")}</span>` : ""}<h1${e.text("names", { join: gl(" и ", " & ") })}>${esc(c.names)}</h1><p class="ac-cover-date"${e.text("dateText")}>${esc(dateText(ctx.eventDate, ctx.timezone, c.dateText))}</p><a href="#invitation" aria-label="${gl("Листать вниз", "Scroll down")}" class="ac-down">↓</a></div>`, ctx.editable) + frame(block, "ac-invite", `<div class="ac-corners">${rings()}<h2 id="invitation"${e.text("title")}>${esc(c.title)}</h2><p${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p>${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Пара", "The couple")}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото пары", "Add a photo of the couple")}</span>` : ""}</div>`, ctx.editable);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        return frame(block, "ac-countdown-section", `<h2${e.text("title")}>${esc(c.title)}</h2><div class="ac-clock" data-until="${ctx.eventDate?.getTime() ?? 0}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, i) => `<div><strong data-unit="${unit}">00</strong><span>${(guestLang() === "en" ? ["days", "hours", "minutes", "seconds"] : ["дней", "часов", "минут", "секунд"])[i]}</span></div>`).join("")}</div><span class="ac-long-rule"></span>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame(block, "ac-program", `<h2 id="program"${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, i) => `<li><time${e.text(`items.${i}.time`)}>${esc(item.time)}</time>${programIcon(i)}<div><h3${e.text(`items.${i}.title`)}>${esc(item.title)}</h3><p${e.text(`items.${i}.note`)}>${esc(item.note)}</p></div>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${i}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? `<button type="button" class="ac-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return frame(block, "ac-photo-break", `${c.items.map((item, i) => item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption || c.title)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : "").join("")}`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return frame(block, "ac-venue", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="ac-venue-lead"${e.text("note", { multiline: true })}>${esc(c.note)}</p><h3${e.text("name")}>${esc(c.name)}</h3><p class="ac-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p>${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Место торжества", "Wedding venue")}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото места", "Add a venue photo")}</span>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "MAP": {
        const c = block.content as BlockContentMap["MAP"];
        const href = c.yandexUrl || c.googleUrl;
        return frame(block, "ac-map", `${liveMap(blocks, c.yandexUrl)}${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${L("antic.map.link", gl("Открыть маршрут ↗", "Get directions ↗"))}</a>` : ""}<p${e.text("note", { multiline: true })}>${esc(c.note)}</p>${ctx.editable ? e.link("yandexUrl", c.yandexUrl) : ""}`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        if (position === blocks.length - 1) return frame(block, "ac-finale", `${cake()}<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text")}>${esc(c.text)}</p>`, ctx.editable);
        if ((c as { wishlist?: boolean }).wishlist) {
          return frame(block, "ac-detail ac-wishlist", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
        }
        const title = !details ? `<h2${e.text("tag")}>${esc(c.tag || gl("Детали", "Details"))}</h2>` : "";
        details = true;
        return frame(block, "ac-detail", `${title}<p${e.text("text", { multiline: true })}>${esc(c.text)}</p><span aria-hidden="true">~</span>`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame(block, "ac-dress", `<span class="ac-dress-rule"></span><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="ac-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" aria-label="${gl("Цвет палитры", "Palette color")} ${i + 1}"${e.color(`palette.${i}`)}></span>`).join("")}</div>${svg('<path d="M51 12c-3 35 0 54 9 57 10 3 15-19 12-57zM53 42h17M61 70v31m-20 5h40m-20-5-20 5m20-5 20 5M46 30c-14-9-21-7-22 2-1 8 10 11 22 8m30-10c14-9 21-7 22 2 1 8-10 11-22 8"/>', "ac-glass")}`, ctx.editable);
      }
      case "RSVP_FORM": return form(block, ctx);
      default: return "";
    }
  }).join("");
}
