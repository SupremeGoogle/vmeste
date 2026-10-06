import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { L } from "@/server/guest-html/template-labels";

type Context = { eventDate?: Date; timezone: string; rsvp: TiliRsvp | null; musicUrl: string; editable: boolean };

function section(block: InviteBlockView, className: string, body: string, editable: boolean, id = "") {
  const e = editAttrs(block.id, editable);
  return `<section class="fg-section ${className}"${id ? ` id="${id}"` : ""}${e.section()}>${e.tools()}${body}</section>`;
}

function dateParts(date: Date | undefined, timezone: string) {
  const parts = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date ?? new Date("2027-09-28T12:00:00Z"));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 1);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function calendar(date: Date | undefined, timezone: string) {
  const { year, month, day } = dateParts(date, timezone);
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const n = i - start + 1;
    const muted = n < 1 || n > daysInMonth;
    const shown = n < 1 ? new Date(Date.UTC(year, month - 1, n)).getUTCDate() : n > daysInMonth ? n - daysInMonth : n;
    return `<span class="fg-calendar-day${muted ? " fg-muted-day" : ""}${n === day ? " fg-day-heart" : ""}"${n === day ? ' aria-label="День свадьбы"' : ""}>${n === day ? `<span>♥</span><b>${shown}</b>` : shown}</span>`;
  }).join("");
  return `<div class="fg-calendar" aria-label="Календарь свадьбы: ${esc(monthName)}"><h3>${esc(monthName)}</h3><div class="fg-calendar-grid">${["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((name) => `<small>${name}</small>`).join("")}${cells}</div></div>`;
}

function form(block: InviteBlockView, ctx: Context) {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const action = r?.action ?? "";
  const drinks = r?.drinks ?? [{ id: "red", title: "Красное вино" }, { id: "white", title: "Белое вино" }, { id: "sparkling", title: "Игристое" }, { id: "soft", title: "Безалкогольное" }];
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? [hidden("mealOptionId", r.keep.mealOptionId), hidden("comment", r.keep.comment), hidden("plusOneName", r.keep.plusOneName), hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId), ...r.keep.plusOneDrinkOptionIds.map((id) => hidden("plusOneDrinkOptionIds", id))].join("") : "";
  return section(block, "fg-rsvp", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="fg-lead"${e.text("text", { multiline: true })}>${esc(c.text)}</p>
    ${r?.saved ? `<p class="fg-form-ok">${esc(c.successText || "Спасибо! Ваш ответ получен.")}</p>` : ""}${r?.error ? '<p class="fg-form-error">Проверьте заполнение анкеты.</p>' : ""}
    <form class="fg-form" method="post"${action ? ` action="${esc(action)}"` : ' data-demo="true"'}><input type="hidden" name="from" value="invite">${keep}
      <label class="fg-field"><span${e.text("nameLabel")}>${esc(c.nameLabel || "Ваше имя")}</span><input name="guestName" type="text" value="${esc(r?.guestName ?? "")}" placeholder="Как к вам обращаться" maxlength="120" required></label>
      <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || "Вы придёте?")}</legend><div class="fg-choices"><label><input type="radio" name="status" value="ACCEPTED" required${r?.status === "ACCEPTED" ? " checked" : ""}><span>${esc(c.yesLabel || "Приду")}</span></label><label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}><span>${esc(c.noLabel || "Не смогу")}</span></label></div></fieldset>
      ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || "Напитки")}</legend><div class="fg-drinks">${drinks.map((drink) => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(drink.id)}"${r?.chosenDrinks.includes(drink.id) ? " checked" : ""}><span>${esc(drink.title)}</span></label>`).join("")}</div></fieldset>`}
      ${r?.extraFields ?? ""}<button type="submit" class="fg-button">${esc(c.buttonLabel || "Отправить ответ")}</button><p class="fg-demo-hint" hidden>Ответ можно отправить по личной ссылке на приглашение.</p>
    </form>`, ctx.editable, "rsvp");
}

export function renderFloralGardenBlocks(blocks: InviteBlockView[], ctx: Context): string {
  const names = (blocks.find((block) => block.type === "COVER")?.content as BlockContentMap["COVER"] | undefined)?.names ?? "";
  let textCount = 0;
  return blocks.map((block) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        const parts = c.names.split(/\s+(?:и|&|and)\s+/i);
        const weekday = ctx.eventDate ? new Intl.DateTimeFormat("ru-RU", { weekday: "long", timeZone: ctx.timezone }).format(ctx.eventDate) : "";
        return section(block, "fg-cover", `${c.imageUrl ? `<picture class="fg-cover-picture">${c.imageUrl === "/media/invite-floral-garden/garden.webp" ? '<source media="(max-width:700px)" srcset="/media/invite-floral-garden/garden-mobile.webp">' : ""}<img class="fg-cover-image" src="${esc(c.imageUrl)}" alt="Цветочный сад"${e.image("imageUrl")}></picture>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фото обложки</span>` : ""}<div class="fg-cover-shade"></div><div class="fg-cover-content"><p class="fg-cover-kicker"${e.text("title")}>${esc(c.title)}</p><h1${e.text("names", { join: " и " })}>${parts.length > 1 ? `${esc(parts[0])}<em>и</em>${esc(parts.slice(1).join(" и "))}` : esc(c.names)}</h1><div class="fg-cover-date"><div><strong${e.text("dateText")}>${esc(c.dateText)}</strong>${weekday ? `<small>${esc(weekday)}</small>` : ""}</div><span${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</span></div></div><a class="fg-unlock" href="#greeting" aria-label="Открыть приглашение"><span aria-hidden="true">♡</span>${L("floral-garden.t5", "Разблокировать приглашение")}</a>${ctx.musicUrl ? `<audio id="fg-music" src="${esc(ctx.musicUrl)}" preload="none" loop></audio><button id="fg-music-toggle" type="button" aria-label="Включить музыку" aria-pressed="false">♫</button>` : ""}`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        textCount++;
        const cls = textCount === 1 ? "fg-greeting" : c.tag === "wishes" ? "fg-wishes" : c.tag === "contacts" ? "fg-contacts" : "fg-text";
        const lines = c.text.split("\n").map((line) => line.trim()).filter(Boolean);
        const copy = c.tag === "wishes" ? lines.map((line) => `<p>${esc(line)}</p>`).join("") : c.tag === "contacts" ? `<p>${esc(lines[0] ?? "")}</p><div class="fg-contact-links">${lines.slice(1).map((line) => { const phone = line.replace(/[^\d+]/g, ""); const telegram = line.match(/^@([a-zA-Z0-9_]{4,32})$/); return telegram ? `<a href="https://t.me/${telegram[1]}" target="_blank" rel="noopener noreferrer">Telegram<br><strong>${esc(line)}</strong></a>` : /^\+?\d{10,15}$/.test(phone) ? `<a href="tel:${esc(phone)}">${L("floral-garden.t6", "Телефон")}<br><strong>${esc(line)}</strong></a>` : `<span>${esc(line)}</span>`; }).join("")}</div>` : `<p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`;
        return section(block, cls, `<h2${e.text("title")}>${esc(c.title)}</h2><div class="fg-copy"${c.tag === "wishes" || c.tag === "contacts" ? e.text("text", { multiline: true }) : ""}>${copy}</div>${textCount === 1 ? `<p class="fg-signature">С любовью, ${esc(names.replace(/\s+и\s+/i, " & "))}</p>` : ""}`, ctx.editable, textCount === 1 ? "greeting" : "");
      }
      case "CALENDAR": {
        const c = block.content as BlockContentMap["CALENDAR"];
        return section(block, "fg-calendar-section", `${calendar(ctx.eventDate, ctx.timezone)}<span class="fg-calendar-message"${e.text("message")}>${esc(c.message)}</span>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return section(block, "fg-timeline", `<h2${e.text("title")}>${esc(c.title)}</h2><div class="fg-timeline-items">${c.items.map((item, i) => `<div class="fg-event"><time${e.text(`items.${i}.time`)}>${esc(item.time)}</time><span class="fg-event-heart" aria-hidden="true">♥</span><h3${e.text(`items.${i}.title`)}>${esc(item.title)}</h3><p${e.text(`items.${i}.note`)}>${esc(item.note)}</p>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${i}" title="Удалить пункт">×</button>` : ""}</div>`).join("")}</div>${ctx.editable ? '<button type="button" class="fg-add" data-block-action="add-detail">+ Добавить пункт</button>' : ""}`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return section(block, "fg-venue", `<h2${e.text("title")}>${esc(c.title)}</h2>${c.imageUrl ? `<img class="fg-venue-image" src="${esc(c.imageUrl)}" alt="${esc(c.name)}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фото места</span>` : ""}<h3${e.text("name")}>${esc(c.name)}</h3><p class="fg-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p>${c.mapUrl ? `<a class="fg-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer"><span${e.text("mapLabel")}>${esc(c.mapLabel || "Смотреть на карте")}</span></a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}<h4>${L("floral-garden.t4", "Полезно знать")}</h4><p class="fg-venue-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p>`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return section(block, "fg-dress", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="fg-palette" aria-label="Цвета дресс-кода">${c.palette.map((color, i) => `<span style="background:${esc(color)}" aria-label="Цвет ${i + 1}"${e.color(`palette.${i}`)}></span>`).join("")}</div>`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return section(block, "fg-photos", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="fg-lead">${L("floral-garden.t3", "Наша история началась с простой встречи и выросла в решение идти дальше вместе.")}</p><div class="fg-gallery">${c.items.map((item, i) => `<figure>${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image(`items.${i}.imageUrl`)}>Добавить фото</span>` : ""}<figcaption${e.text(`items.${i}.caption`)}>${esc(item.caption)}</figcaption></figure>`).join("")}</div><div class="fg-gallery-controls"><button type="button" data-gallery="prev" aria-label="Предыдущее фото">←</button><button type="button" data-gallery="next" aria-label="Следующее фото">→</button></div>`, ctx.editable);
      }
      case "RSVP_FORM": return form(block, ctx);
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        return section(block, "fg-countdown", `<h2${e.text("title")}>${esc(c.title)}</h2><p>${L("floral-garden.t1", "До свадьбы осталось:")}</p><div class="fg-clock" data-until="${ctx.eventDate?.getTime() ?? 0}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, i) => `<div><strong data-unit="${unit}">00</strong><span>${["дней", "часов", "минут", "секунд"][i]}</span></div>`).join("")}</div><span class="fg-finale">${L("floral-garden.t2", "Ждём вас!")}<br>${esc(names)}</span>`, ctx.editable);
      }
      default: return "";
    }
  }).join("");
}
