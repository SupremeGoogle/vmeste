import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";

type Context = { eventDate?: Date; timezone: string; rsvp: TiliRsvp | null; editable: boolean };
const frame = (block: InviteBlockView, cls: string, body: string, editable: boolean, id = "") => {
  const e = editAttrs(block.id, editable);
  return `<section class="sv-section ${cls}"${id ? ` id="${id}"` : ""}${e.section()}>${e.tools()}${body}</section>`;
};
const dateText = (date: Date | undefined, zone: string, fallback: string) => date
  ? new Intl.DateTimeFormat(guestLang() === "en" ? "en-US" : "ru-RU", { timeZone: zone, day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
  : fallback;

function form(block: InviteBlockView, ctx: Context): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const drinks = r?.drinks ?? (guestLang() === "en" ? ["Sparkling wine", "Red wine", "White wine", "Non-alcoholic"] : ["Игристое", "Красное вино", "Белое вино", "Безалкогольное"]).map((title, i) => ({ id: `demo-${i}`, title }));
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? [hidden("mealOptionId", r.keep.mealOptionId), hidden("comment", r.keep.comment), hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId), ...r.keep.plusOneDrinkOptionIds.map(id => hidden("plusOneDrinkOptionIds", id))].join("") : "";
  const plusAllowed = r ? (r as TiliRsvp & { plusOneAllowed?: boolean }).plusOneAllowed ?? true : true;
  return frame(block, "sv-rsvp", `<span class="sv-kicker">${L("skvoz-vremya.t6", gl("Пожалуйста, дайте знать", "Please let us know"))}</span><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>${r?.saved ? `<p class="sv-success">${esc(c.successText || gl("Ответ получен", "Reply received"))}</p>` : ""}${r?.error ? `<p class="sv-error">${gl("Проверьте анкету или срок ответа.", "Please check your answers or the reply deadline.")}</p>` : ""}
  <form class="sv-form" method="post"${r?.action ? ` action="${esc(r.action)}"` : ' data-demo="true"'}><input type="hidden" name="from" value="invite">${keep}
  <label class="sv-name"><span${e.text("nameLabel")}>${esc(c.nameLabel)}</span><input type="text" name="guestName" value="${esc(r?.guestName ?? "")}" placeholder="${gl("Ваше имя и фамилия", "Your full name")}" maxlength="120" required></label>
  <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel)}</legend><label><input type="radio" name="status" value="ACCEPTED" required${!r || r.status === "ACCEPTED" ? " checked" : ""}>${esc(c.yesLabel)}</label><label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}>${esc(c.noLabel)}</label>${plusAllowed ? `<label><input type="checkbox" name="svPlusOne" value="yes"${r?.keep.plusOneName ? " checked" : ""}>${L("skvoz-vremya.t1", gl("Буду +1", "Bringing a +1"))}</label><label class="sv-plus-name"><span>${L("skvoz-vremya.t3", gl("Имя спутника", "Your guest’s name"))}</span><input type="text" name="plusOneName" value="${esc(r?.keep.plusOneName ?? "")}" maxlength="120" placeholder="${gl("Имя и фамилия", "Full name")}"></label>` : ""}</fieldset>
  ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel)}</legend><div class="sv-drinks">${drinks.map(d => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(d.id)}"${r?.chosenDrinks.includes(d.id) ? " checked" : ""}>${esc(d.title)}</label>`).join("")}</div></fieldset>`}
  ${r?.extraFields ?? ""}<p class="sv-demo-note" hidden>${gl("Ответить можно по именной ссылке из приглашения.", "You can reply using the personal link from your invitation.")}</p><button type="submit"${e.text("buttonLabel")}>${esc(c.buttonLabel)}</button></form>`, ctx.editable, "rsvp");
}

export function renderSkvozVremyaBlocks(blocks: InviteBlockView[], ctx: Context): string {
  let detailStarted = false;
  return blocks.map((block, index) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        return frame(block, "sv-cover", `${c.imageUrl ? `<img class="sv-cover-photo" src="${esc(c.imageUrl)}" alt="${gl("Фотография пары", "Photo of the couple")}"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото пары", "Add a photo of the couple")}</span>` : ""}<div class="sv-cover-content"><p class="sv-cover-kicker">${L("skvoz-vremya.t10", gl("приглашение на свадьбу", "wedding invitation"))}</p><h1${e.text("names", { join: gl(" и ", " & ") })}>${esc(c.names)}</h1><p class="sv-cover-date"${e.text("dateText")}>${esc(dateText(ctx.eventDate, ctx.timezone, c.dateText))}</p><a class="sv-open" href="#sv-story">${L("skvoz-vremya.t5", gl("Открыть приглашение", "Open the invitation"))}</a></div>`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        if (index === blocks.length - 1) return frame(block, "sv-finale", `<span class="sv-heart" aria-hidden="true">♡</span><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
        if (index < 3) return frame(block, "sv-story", `<span class="sv-story-date">${esc(dateText(ctx.eventDate, ctx.timezone, gl("20.06.2027", "06/20/2027")).replace(/[./]/g, " · "))}</span><div class="sv-story-copy"><span class="sv-kicker"${e.text("tag")}>${esc(c.tag)}</span><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><span class="sv-heart" aria-hidden="true">♡</span></div>`, ctx.editable, "sv-story");
        const title = detailStarted ? "" : `<h2 class="sv-details-title"${e.text("tag")}>${esc(c.tag || gl("Детали", "Details"))}</h2>`;
        detailStarted = true;
        return frame(block, "sv-detail", `${title}<h3${e.text("title")}>${esc(c.title)}</h3><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><span class="sv-tilde" aria-hidden="true">~</span>`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return frame(block, "sv-photos", `<div class="sv-photos-inner"><span class="sv-scribble">${L("skvoz-vremya.t11", gl("через годы — вместе", "through the years — together"))}</span>${c.items.map((item, i) => `<figure class="sv-polaroid sv-polaroid-${i}">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption || c.title)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image(`items.${i}.imageUrl`)}>${gl("Добавить фото", "Add a photo")}</span>` : ""}<figcaption${e.text(`items.${i}.caption`)}>${esc(item.caption)}</figcaption></figure>`).join("")}</div>`, ctx.editable);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        return frame(block, "sv-countdown", `<p class="sv-kicker">${L("skvoz-vremya.t7", gl("Скоро увидимся", "See you soon"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="sv-clock" data-until="${ctx.eventDate?.getTime() ?? 0}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, i) => `<div><strong data-unit="${unit}">00</strong><span>${(guestLang() === "en" ? ["days", "hours", "minutes", "seconds"] : ["дней", "часов", "минут", "секунд"])[i]}</span></div>`).join("")}</div><p class="sv-countdown-foot">${L("skvoz-vremya.t9", gl("и начнётся наша новая история", "and our new story begins"))}</p>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame(block, "sv-timeline", `<p class="sv-kicker">${L("skvoz-vremya.t8", gl("События нашего дня", "Moments of our day"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, i) => `<li><time${e.text(`items.${i}.time`)}>${esc(item.time)}</time><div><h3${e.text(`items.${i}.title`)}>${esc(item.title)}</h3><p${e.text(`items.${i}.note`)}>${esc(item.note)}</p></div>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${i}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? `<button type="button" class="sv-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return frame(block, "sv-venue", `<p class="sv-kicker">${L("skvoz-vremya.t2", gl("Где встретимся", "Where we’ll meet"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="sv-venue-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.imageUrl ? `<div class="sv-venue-photo"><img src="${esc(c.imageUrl)}" alt="${gl("Место праздника", "The venue")}" loading="lazy"${e.image("imageUrl")}></div>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото места", "Add a venue photo")}</span>` : ""}<h3${e.text("name")}>${esc(c.name)}</h3><p class="sv-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p>${c.mapUrl ? `<a class="sv-map" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${gl("Открыть карту", "Open map")}: ${esc(c.name)}"><span class="sv-map-road sv-map-road-one"></span><span class="sv-map-road sv-map-road-two"></span><span class="sv-map-road sv-map-road-three"></span><span class="sv-map-pin">♡</span><span class="sv-map-label">${esc(c.name)}</span></a><a class="sv-route" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.mapLabel || gl("Построить маршрут", "Get directions"))} ↗</a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame(block, "sv-dress", `<p class="sv-kicker">${L("skvoz-vremya.t4", gl("Немного вдохновения", "A little inspiration"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="sv-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" aria-label="${gl("Цвет палитры", "Palette color")} ${i + 1}"${e.color(`palette.${i}`)}></span>`).join("")}</div>`, ctx.editable);
      }
      case "RSVP_FORM": return form(block, ctx);
      default: return "";
    }
  }).join("");
}
