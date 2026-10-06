import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { initialsOf, L } from "@/server/guest-html/template-labels";

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
  return `<span class="bo-name-first">${esc(parts[1])}</span><span class="bo-name-and">и</span><span class="bo-name-second">${esc(parts[2])}</span>`;
}

function form(block: InviteBlockView, ctx: Context): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const action = r?.action ?? "";
  const plusOneAllowed = r ? (r as TiliRsvp & { plusOneAllowed?: boolean }).plusOneAllowed ?? true : true;
  const drinks = r ? r.drinks : [
    { id: "sample-red", title: "Вино красное" }, { id: "sample-white", title: "Вино белое" },
    { id: "sample-whisky", title: "Виски" }, { id: "sample-vodka", title: "Водка" },
    { id: "sample-sparkling", title: "Шампанское" }, { id: "sample-soft", title: "Безалкогольное" },
  ];
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? [
    hidden("mealOptionId", r.keep.mealOptionId), hidden("comment", r.keep.comment),
    hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId),
    ...r.keep.plusOneDrinkOptionIds.map(id => hidden("plusOneDrinkOptionIds", id)),
  ].join("") : "";
  const error = r?.error ? `<p class="bo-form-error">Проверьте заполнение анкеты или срок ответа.</p>` : "";
  const answer = r?.saved ? `<p class="bo-form-ok">${esc(c.successText || "Спасибо! Ваш ответ получен.")}</p>` : "";
  const nameValue = r?.guestName ?? "";
  return frame(block, "bo-rsvp", `${garland}${title(c.title, "Присутствие гостя", e.text("title"))}
    <p class="bo-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${answer}${error}
    <form class="bo-form" method="post"${action ? ` action="${esc(action)}"` : ' data-demo="true"'}>
      <input type="hidden" name="from" value="invite">${keep}
      <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || "Сможете ли вы присутствовать на торжестве?")}</legend>
        <label><input type="radio" name="status" value="ACCEPTED" required${r?.status === "ACCEPTED" && !r.keep.plusOneName ? " checked" : ""}> ${esc(c.yesLabel || "Я приду / Мы придём")}</label>
        <label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}> ${esc(c.noLabel || "Прийти не получится")}</label>
        ${plusOneAllowed ? `<label><input type="radio" name="status" value="ACCEPTED"${r?.status === "ACCEPTED" && r.keep.plusOneName ? " checked" : ""}> ${L("bohema.form.plus-one", "Буду +1")}</label>` : ""}
      </fieldset>
      <label class="bo-input-label"><span${e.text("nameLabel")}>${esc(c.nameLabel || "Введите имя и фамилию")}</span>
        ${L("bohema.form.name-hint", "Если вы будете парой или семьёй, укажите все имена и фамилии", { tag: "small" })}
        <input type="text" name="guestName" value="${esc(nameValue)}" placeholder="Имя и фамилия" required maxlength="120"></label>
      ${plusOneAllowed ? `<label class="bo-input-label">${L("bohema.form.plus-one-name", "Если придёте вдвоём")}<input type="text" name="plusOneName" value="${esc(r?.keep.plusOneName ?? "")}" placeholder="Имя спутника" maxlength="120"></label>` : ""}
      ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || "Предпочтения по напиткам")}</legend>${drinks.length ? L("bohema.form.drinks-hint", "Можно выбрать несколько вариантов", { tag: "small" }) : "<small>Напитки добавляются в настройках мероприятия</small>"}
        <div class="bo-drinks">${drinks.map(drink => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(drink.id)}"${r?.chosenDrinks.includes(drink.id) ? " checked" : ""}> ${esc(drink.title)}</label>`).join("")}</div>
      </fieldset>`}
      ${r?.extraFields ?? ""}<p class="bo-demo-note" hidden>Ответить можно по именной ссылке из вашего приглашения.</p>
      <button type="submit">${esc(r?.status !== "PENDING" && r ? "Изменить ответ" : c.buttonLabel || "Отправить")}</button>
    </form>`, ctx.editable);
}

export function renderBohemaBlocks(blocks: InviteBlockView[], theme: InviteTheme, ctx: Context): string {
  const music = theme.musicUrl ? `<audio id="bo-audio" src="${esc(theme.musicUrl)}" loop preload="none"></audio><button type="button" class="bo-music" aria-label="Включить музыку" aria-pressed="false">♫</button>` : "";
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
          ${!c.imageUrl && ctx.editable ? `<span class="bo-cover-image-edit"${e.image("imageUrl")}>Добавить свой фон</span>` : ""}`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame(block, "bo-program", `${garland}${title(c.title, "Программа дня", e.text("title"))}<ol class="bo-list">${c.items.map((item, index) => `<li><h3>— <time${e.text(`items.${index}.time`)}>${esc(item.time)}</time> <span${e.text(`items.${index}.title`)}>${esc(item.title)}</span></h3><p${e.text(`items.${index}.note`)}>${esc(item.note)}</p>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить пункт">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? '<button type="button" class="bo-add" data-block-action="add-detail">+ Добавить пункт</button>' : ""}<div class="bo-flourish" aria-hidden="true">✦</div>`, ctx.editable);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        const until = ctx.eventDate?.getTime() ?? new Date("2027-11-20T13:00:00+03:00").getTime();
        return frame(block, "bo-countdown-section", `<p class="bo-countdown-title"${e.text("title")}>${esc(c.title)}</p><div class="bo-countdown" data-until="${until}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, i) => `<div><b data-unit="${unit}">00</b>${L(`bohema.countdown.${unit}`, ["Дни", "Часы", "Мин", "Сек"][i])}</div>`).join("")}</div>`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        const photo = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="Площадка торжества" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию площадки</span>` : "";
        return frame(block, "bo-venue", `${garland}${title(c.title, "Место торжества", e.text("title"))}${L("bohema.venue.lead", "Наш праздник пройдёт на площадке:", { tag: "p", className: "bo-small" })}<p class="bo-venue-name"${e.text("name")}>${esc(c.name)}</p><p class="bo-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p><figure class="bo-venue-photo">${photo}</figure><p class="bo-intro"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.mapUrl ? `<a class="bo-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.mapLabel || "Открыть карту")}</a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        // Виш-лист — отдельный раздел со своим заголовком, а не пункт «Важных деталей».
        if ((c as { wishlist?: boolean }).wishlist) {
          return frame(block, "bo-text bo-wishlist", `${garland}${c.tag || ctx.editable ? `<p class="bo-overline"${e.text("tag")}>${esc(c.tag)}</p>` : ""}${title(c.title, "Наш виш-лист", e.text("title"))}<p class="bo-intro"${e.text("text", { multiline: true })}>${esc(c.text).replace(/\n/g, "<br>")}</p>`, ctx.editable);
        }
        const detail = /детал/i.test(c.tag);
        const organizer = /организац/i.test(c.tag);
        const closing = /встреч/i.test(c.title);
        const head = detail && !detailsShown ? `${garland}${title(c.tag, "Важные детали", e.text("tag"))}` : organizer ? `${garland}${title(c.tag, "Организация торжества", e.text("tag"))}` : "";
        if (detail) detailsShown = true;
        return frame(block, `bo-text${detail ? " bo-detail" : ""}${organizer ? " bo-organizer" : ""}${closing ? " bo-closing" : ""}`, `${head}${closing ? "" : `<h3${e.text("title")}>${detail ? "— " : ""}${esc(c.title)}</h3>`}<p${e.text("text", { multiline: true })}>${esc(c.text).replace(/\n/g, "<br>")}</p>${closing ? `<p class="bo-goodbye"${e.text("title")}>${esc(c.title)}</p>` : ""}`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame(block, "bo-dress", `${garland}<p class="bo-overline"${e.text("tag")}>${esc(c.tag)}</p>${title(c.title, "Дресс-код", e.text("title"))}<p class="bo-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="bo-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${i}`)}></span>`).join("")}</div>`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return frame(block, "bo-looks", `${c.items.map((item, i) => `<figure><figcaption${e.text(`items.${i}.caption`)}>${esc(item.caption)}</figcaption>${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="Образы: ${esc(item.caption)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : `<span class="ie-image-placeholder"${e.image(`items.${i}.imageUrl`)}>Добавить фото</span>`}</figure>`).join("")}${garland}`, ctx.editable);
      }
      case "RSVP_FORM": return form(block, ctx);
      default: return "";
    }
  }).join("");
  // Монограмма — из имён пары и правится (стандарт, §5). В редакторе
  // заставка стоит над приглашением неподвижно: иначе её надписи нечем
  // было бы поправить.
  const monogram = `<span>${L("bohema.monogram.first", firstInitial || "В")}${L("bohema.monogram.second", secondInitial || "Д", { className: "bo-monogram-script" })}</span>`;
  const introBody = `<div class="bo-intro-landscape"></div><div class="bo-intro-hill"></div><button type="button" class="bo-open" aria-label="Открыть приглашение">${monogram}</button>${L("bohema.intro.hint", "Нажмите, чтобы открыть приглашение", { tag: "p" })}`;
  const intro = !introShown || (ctx.editable && theme.introOff) ? "" : ctx.editable
    ? `<style>html.ie-editing .bo-intro-cover.bo-intro-preview{display:grid;position:relative;inset:auto;z-index:1;height:34rem}.bo-intro-preview::before{content:"Заставка — гость видит её при открытии";position:absolute;top:.75rem;left:50%;transform:translateX(-50%);z-index:3;padding:.3rem .7rem;border-radius:.4rem;background:#2a1d0dcc;color:#fff;font:600 12px/1.2 system-ui,sans-serif}</style><div class="bo-intro-cover bo-intro-preview">${introBody}</div>`
    : `<div class="bo-intro-cover" id="bo-intro-cover">${introBody}</div>`;
  return intro + music + sections;
}
