import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { initialsOf, L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";

type Context = { eventDate?: Date; rsvp: TiliRsvp | null; editable: boolean };
const garland = '<img class="bo-garland" src="/media/invite-bohema/floral-garland.webp" alt="" aria-hidden="true">';

function splitTitle(value: string, fallback: string): [string, string] {
  const words = (value.trim() || fallback).split(/\s+/);
  return [words[0], words.slice(1).join(" ")];
}

function title(value: string, fallback: string, attrs = ""): string {
  const [first, second] = splitTitle(value, fallback);
  return `<h2 class="bo-heading"${attrs}><span>${esc(first)}</span><em>${esc(second)}</em></h2>`;
}

function frame(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="bo-section ${className}"${className === "bo-rsvp" ? ' id="rsvp"' : ""}${e.section()}>${e.tools()}${body}</section>`;
}

function names(value: string): string {
  const parts = value.trim().match(/^(.+?)\s+(?:и|&|and|\+)\s+(.+)$/i);
  if (!parts) return `<span class="bo-name-first">${esc(value)}</span>`;
  return `<span class="bo-name-first">${esc(parts[1])}</span><span class="bo-name-and">${gl("и", "&amp;")}</span><span class="bo-name-second">${esc(parts[2])}</span>`;
}

function form(block: InviteBlockView, ctx: Context): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const action = r?.action ?? "";
  const plusOneAllowed = r ? (r as TiliRsvp & { plusOneAllowed?: boolean }).plusOneAllowed ?? true : true;
  const drinks = r ? r.drinks : [
    { id: "sample-red", title: gl("Вино красное", "Red wine") }, { id: "sample-white", title: gl("Вино белое", "White wine") },
    { id: "sample-whisky", title: gl("Виски", "Whisky") }, { id: "sample-vodka", title: gl("Водка", "Vodka") },
    { id: "sample-sparkling", title: gl("Шампанское", "Champagne") }, { id: "sample-soft", title: gl("Безалкогольное", "Non-alcoholic") },
  ];
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? [
    hidden("mealOptionId", r.keep.mealOptionId), hidden("comment", r.keep.comment),
    hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId),
    ...r.keep.plusOneDrinkOptionIds.map(id => hidden("plusOneDrinkOptionIds", id)),
  ].join("") : "";
  const error = r?.error ? `<p class="bo-form-error">${gl("Проверьте заполнение анкеты или срок ответа.", "Please check your answers or the reply deadline.")}</p>` : "";
  const answer = r?.saved ? `<p class="bo-form-ok">${esc(c.successText || gl("Спасибо! Ваш ответ получен.", "Thank you! We’ve received your reply."))}</p>` : "";
  const nameValue = r?.guestName ?? "";
  return frame(block, "bo-rsvp", `${garland}${title(c.title, gl("Присутствие гостя", "RSVP"), e.text("title"))}
    <p class="bo-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${answer}${error}
    <form class="bo-form" method="post"${action ? ` action="${esc(action)}"` : ' data-demo="true"'}>
      <input type="hidden" name="from" value="invite">${keep}
      <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || gl("Сможете ли вы присутствовать на торжестве?", "Will you be able to attend?"))}</legend>
        <label><input type="radio" name="status" value="ACCEPTED" required${r?.status === "ACCEPTED" && !r.keep.plusOneName ? " checked" : ""}> ${esc(c.yesLabel || gl("Я приду / Мы придём", "Joyfully accepts"))}</label>
        <label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}> ${esc(c.noLabel || gl("Прийти не получится", "Regretfully declines"))}</label>
        ${plusOneAllowed ? `<label><input type="radio" name="status" value="ACCEPTED"${r?.status === "ACCEPTED" && r.keep.plusOneName ? " checked" : ""}> ${L("bohema.form.plus-one", gl("Буду +1", "I’m bringing a guest"))}</label>` : ""}
      </fieldset>
      <label class="bo-input-label"><span${e.text("nameLabel")}>${esc(c.nameLabel || gl("Введите имя и фамилию", "Your full name"))}</span>
        ${L("bohema.form.name-hint", gl("Если вы будете парой или семьёй, укажите все имена и фамилии", "Coming as a couple or family? Please list everyone’s full names"), { tag: "small" })}
        <input type="text" name="guestName" value="${esc(nameValue)}" placeholder="${gl("Имя и фамилия", "Full name")}" required maxlength="120"></label>
      ${plusOneAllowed ? `<label class="bo-input-label">${L("bohema.form.plus-one-name", gl("Если придёте вдвоём", "If you’re bringing a guest"))}<input type="text" name="plusOneName" value="${esc(r?.keep.plusOneName ?? "")}" placeholder="${gl("Имя спутника", "Guest’s name")}" maxlength="120"></label>` : ""}
      ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || gl("Предпочтения по напиткам", "Drink preferences"))}</legend>${drinks.length ? L("bohema.form.drinks-hint", gl("Можно выбрать несколько вариантов", "Choose as many as you like"), { tag: "small" }) : `<small>${gl("Напитки добавляются в настройках мероприятия", "Drinks are added in the event settings")}</small>`}
        <div class="bo-drinks">${drinks.map(drink => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(drink.id)}"${r?.chosenDrinks.includes(drink.id) ? " checked" : ""}> ${esc(drink.title)}</label>`).join("")}</div>
      </fieldset>`}
      ${r?.extraFields ?? ""}<p class="bo-demo-note" hidden>${gl("Ответить можно по именной ссылке из вашего приглашения.", "You can reply using the personal link from your invitation.")}</p>
      <button type="submit">${esc(r?.status !== "PENDING" && r ? gl("Изменить ответ", "Update reply") : c.buttonLabel || gl("Отправить", "Send"))}</button>
    </form>`, ctx.editable);
}

export function renderBohemaBlocks(blocks: InviteBlockView[], theme: InviteTheme, ctx: Context): string {
  const music = theme.musicUrl ? `<audio id="bo-audio" src="${esc(theme.musicUrl)}" loop preload="none"></audio><button type="button" class="bo-music" aria-label="${gl("Включить музыку", "Play music")}" data-on="${gl("Выключить музыку", "Pause music")}" data-off="${gl("Включить музыку", "Play music")}" aria-pressed="false">♫</button>` : "";
  let detailsShown = false;
  let introShown = false;
  const coupleNames = (blocks.find((block) => block.type === "COVER")?.content as BlockContentMap["COVER"] | undefined)?.names ?? "";
  const [firstInitial, secondInitial] = initialsOf(coupleNames);
  const sections = blocks.map(block => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        introShown = true;
        return frame(block, "bo-cover", `<div class="bo-cover-picture">${c.imageUrl ? `<img class="bo-cover-custom" src="${esc(c.imageUrl)}" alt="" fetchpriority="high"${e.image("imageUrl")}>` : ""}</div>
          <div class="bo-arch">${garland}<div class="bo-arch-copy"><h1 class="bo-names"${e.text("names")}>${names(c.names)}</h1>
          <p class="bo-kicker"${e.text("title")}>${esc(c.title)}</p>
          <p class="bo-date"${e.text("dateText")}>${esc(c.dateText)}</p>
          <p class="bo-subtitle"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div></div>
          ${!c.imageUrl && ctx.editable ? `<span class="bo-cover-image-edit"${e.image("imageUrl")}>${gl("Добавить свой фон", "Add your own background")}</span>` : ""}`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame(block, "bo-program", `${garland}${title(c.title, gl("Программа дня", "Order of the day"), e.text("title"))}<ol class="bo-list">${c.items.map((item, index) => `<li><h3>— <time${e.text(`items.${index}.time`)}>${esc(item.time)}</time> <span${e.text(`items.${index}.title`)}>${esc(item.title)}</span></h3><p${e.text(`items.${index}.note`)}>${esc(item.note)}</p>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? `<button type="button" class="bo-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}<div class="bo-flourish" aria-hidden="true">✦</div>`, ctx.editable);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        const until = ctx.eventDate?.getTime() ?? new Date("2027-11-20T13:00:00+03:00").getTime();
        return frame(block, "bo-countdown-section", `<p class="bo-countdown-title"${e.text("title")}>${esc(c.title)}</p><div class="bo-countdown" data-until="${until}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, i) => `<div><b data-unit="${unit}">00</b>${L(`bohema.countdown.${unit}`, (guestLang() === "en" ? ["Days", "Hours", "Min", "Sec"] : ["Дни", "Часы", "Мин", "Сек"])[i])}</div>`).join("")}</div>`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        const photo = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Площадка торжества", "Wedding venue")}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фотографию площадки", "Add a venue photo")}</span>` : "";
        return frame(block, "bo-venue", `${garland}${title(c.title, gl("Место торжества", "The venue"), e.text("title"))}${L("bohema.venue.lead", gl("Наш праздник пройдёт на площадке:", "We’ll be celebrating at:"), { tag: "p", className: "bo-small" })}<p class="bo-venue-name"${e.text("name")}>${esc(c.name)}</p><p class="bo-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p><figure class="bo-venue-photo">${photo}</figure><p class="bo-intro"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.mapUrl ? `<a class="bo-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.mapLabel || gl("Открыть карту", "Open map"))}</a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        // Виш-лист — отдельный раздел со своим заголовком, а не пункт «Важных деталей».
        if ((c as { wishlist?: boolean }).wishlist) {
          return frame(block, "bo-text bo-wishlist", `${garland}${c.tag || ctx.editable ? `<p class="bo-overline"${e.text("tag")}>${esc(c.tag)}</p>` : ""}${title(c.title, gl("Наш виш-лист", "Our gift list"), e.text("title"))}<p class="bo-intro"${e.text("text", { multiline: true })}>${esc(c.text).replace(/\n/g, "<br>")}</p>`, ctx.editable);
        }
        const detail = /детал|good to know|detail/i.test(c.tag);
        const organizer = /организац|coordinat|planner/i.test(c.tag);
        const closing = /встреч|see you/i.test(c.title);
        const head = detail && !detailsShown ? `${garland}${title(c.tag, gl("Важные детали", "Good to know"), e.text("tag"))}` : organizer ? `${garland}${title(c.tag, gl("Организация торжества", "Wedding coordination"), e.text("tag"))}` : "";
        if (detail) detailsShown = true;
        return frame(block, `bo-text${detail ? " bo-detail" : ""}${organizer ? " bo-organizer" : ""}${closing ? " bo-closing" : ""}`, `${head}${closing ? "" : `<h3${e.text("title")}>${detail ? "— " : ""}${esc(c.title)}</h3>`}<p${e.text("text", { multiline: true })}>${esc(c.text).replace(/\n/g, "<br>")}</p>${closing ? `<p class="bo-goodbye"${e.text("title")}>${esc(c.title)}</p>` : ""}`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame(block, "bo-dress", `${garland}<p class="bo-overline"${e.text("tag")}>${esc(c.tag)}</p>${title(c.title, gl("Дресс-код", "Dress code"), e.text("title"))}<p class="bo-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="bo-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${i}`)}></span>`).join("")}</div>`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return frame(block, "bo-looks", `${c.items.map((item, i) => `<figure><figcaption${e.text(`items.${i}.caption`)}>${esc(item.caption)}</figcaption>${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${gl("Образы", "Outfits")}: ${esc(item.caption)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : `<span class="ie-image-placeholder"${e.image(`items.${i}.imageUrl`)}>${gl("Добавить фото", "Add a photo")}</span>`}</figure>`).join("")}${garland}`, ctx.editable);
      }
      case "RSVP_FORM": return form(block, ctx);
      default: return "";
    }
  }).join("");
  // Монограмма — из имён пары и правится (стандарт, §5). В редакторе
  // заставка стоит над приглашением неподвижно: иначе её надписи нечем
  // было бы поправить.
  const monogram = `<span>${L("bohema.monogram.first", firstInitial || gl("В", "E"))}${L("bohema.monogram.second", secondInitial || gl("Д", "J"), { className: "bo-monogram-script" })}</span>`;
  const introBody = `<div class="bo-intro-landscape"></div><div class="bo-intro-hill"></div><button type="button" class="bo-open" aria-label="${gl("Открыть приглашение", "Open the invitation")}">${monogram}</button>${L("bohema.intro.hint", gl("Нажмите, чтобы открыть приглашение", "Tap to open the invitation"), { tag: "p" })}`;
  const intro = !introShown || (ctx.editable && theme.introOff) ? "" : ctx.editable
    ? `<style>html.ie-editing .bo-intro-cover.bo-intro-preview{display:grid;position:relative;inset:auto;z-index:1;height:34rem}.bo-intro-preview::before{content:"${gl("Заставка — гость видит её при открытии", "Intro — guests see this when they open the link")}";position:absolute;top:.75rem;left:50%;transform:translateX(-50%);z-index:3;padding:.3rem .7rem;border-radius:.4rem;background:#2a1d0dcc;color:#fff;font:600 12px/1.2 system-ui,sans-serif}</style><div class="bo-intro-cover bo-intro-preview">${introBody}</div>`
    : `<div class="bo-intro-cover" id="bo-intro-cover">${introBody}</div>`;
  return intro + music + sections;
}
