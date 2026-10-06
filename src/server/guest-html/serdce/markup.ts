import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { L } from "@/server/guest-html/template-labels";

type Context = { eventDate?: Date; timezone: string; rsvp: TiliRsvp | null; editable: boolean };
function frame(block: InviteBlockView, type: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="sc-section ${type}"${type.startsWith("sc-rsvp") ? ' id="rsvp"' : ""}${e.section()}>${e.tools()}${body}</section>`;
}
function dateText(date: Date | undefined, zone: string, fallback: string): string {
  return date ? new Intl.DateTimeFormat("ru-RU", { timeZone: zone, day: "numeric", month: "long", year: "numeric" }).format(date).replace(/\s?г\.$/, "") : fallback;
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
      return `${ownerTools}<figure class="sc-polaroid sc-rotate-${(episodeIndex + imageIndex) % 4}">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(content?.title || "Фото пары")}" loading="lazy"${ie.image(path)}>` : ctx.editable ? `<span class="ie-image-placeholder"${ie.image(path)}>Добавить фото</span>` : ""}</figure>`;
    }).join("");
    return `<article class="sc-story-episode sc-episode-${episodeIndex}"${te?.section() ?? ""}>${te?.tools() ?? ""}${pictures ? `<div class="sc-story-photos${episodeIndex === 0 && (episodeImages[0]?.length ?? 0) > 1 ? " paired" : ""}">${pictures}</div>` : ""}${content ? `<div class="sc-story-copy"><h3${te?.text("title") ?? ""}>${esc(content.title)}</h3><p${te?.text("text", { multiline: true }) ?? ""}>${esc(content.text)}</p></div>` : ""}</article>`;
  }).join("");
  return frame(block, "sc-story", `<button class="sc-music-toggle" type="button" aria-label="Включить музыку" aria-pressed="false">♪</button><div id="sc-story" class="sc-story-heading"><h2${coverEdit?.text("names") ?? ""}>${esc(coverContent?.names || "Наша история")}</h2><p${coverEdit?.text("title") ?? ""}>${esc(coverContent?.title || "Приглашение на свадьбу")}</p></div><p class="sc-story-swipe-hint">${L("serdce.t6", "Листайте историю →")}</p><div class="sc-story-track">${episodes}</div><p class="sc-story-quote">${L("serdce.t2", "В каждой истории есть момент,")}<br>${L("serdce.t13", "после которого всё становится общим.")}</p><div class="sc-story-arch" aria-hidden="true"><span>♥</span></div><div class="sc-story-invite"><h2>${L("serdce.t10", "Родные и друзья!")}</h2><p${coverEdit?.text("subtitle", { multiline: true }) ?? ""}>${esc(coverContent?.subtitle || "")}</p><strong>${esc(dateText(ctx.eventDate, ctx.timezone, coverContent?.dateText || ""))}</strong><small${coverEdit?.text("footer") ?? ""}>${esc(coverContent?.footer || "С любовью")}</small></div>`, ctx.editable);
}
function form(block: InviteBlockView, ctx: Context): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, ctx.editable);
  const r = ctx.rsvp;
  const drinks = r ? r.drinks : [
    { id: "demo-red", title: "Вино красное" }, { id: "demo-white", title: "Вино белое" },
    { id: "demo-whisky", title: "Виски" }, { id: "demo-vodka", title: "Водка" },
    { id: "demo-sparkling", title: "Шампанское" }, { id: "demo-soft", title: "Безалкогольное" },
  ];
  const hidden = (name: string, value: string | null) => value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";
  const keep = r ? [hidden("mealOptionId", r.keep.mealOptionId), hidden("comment", r.keep.comment), hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId), ...r.keep.plusOneDrinkOptionIds.map(id => hidden("plusOneDrinkOptionIds", id))].join("") : "";
  const plusOneAllowed = r ? (r as TiliRsvp & { plusOneAllowed?: boolean }).plusOneAllowed ?? true : true;
  return frame(block, "sc-rsvp sc-green", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="sc-rsvp-intro"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${r?.saved ? `<p class="sc-form-ok">${esc(c.successText || "Ответ получен")}</p>` : ""}${r?.error ? '<p class="sc-form-error">Проверьте анкету или срок ответа.</p>' : ""}<form class="sc-form" method="post"${r?.action ? ` action="${esc(r.action)}"` : ' data-demo="true"'}><input type="hidden" name="from" value="invite">${keep}
    <fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || "Сможете ли вы присутствовать?")}</legend><label><input type="radio" name="status" value="ACCEPTED" required${!r || r.status === "ACCEPTED" && !r.keep.plusOneName ? " checked" : ""}> ${esc(c.yesLabel || "Я приду")}</label><label><input type="radio" name="status" value="DECLINED"${r?.status === "DECLINED" ? " checked" : ""}> ${esc(c.noLabel || "Прийти не получится")}</label>${plusOneAllowed ? `<label><input type="radio" name="status" value="ACCEPTED"${r?.status === "ACCEPTED" && r.keep.plusOneName ? " checked" : ""}> ${L("serdce.t1", "Буду +1")}</label>` : ""}</fieldset>
    <label class="sc-field"><span${e.text("nameLabel")}>${esc(c.nameLabel || "Имя и фамилия")}</span><small>${L("serdce.t4", "Если придёте парой или семьёй, укажите все имена")}</small><input type="text" name="guestName" value="${esc(r?.guestName ?? "")}" required placeholder="Имя и фамилия" maxlength="120"></label>${plusOneAllowed ? `<label class="sc-field"><span>${L("serdce.t5", "Имя спутника")}</span><input type="text" name="plusOneName" value="${esc(r?.keep.plusOneName ?? "")}" placeholder="Если придёте вдвоём" maxlength="120"></label>` : ""}
    ${r?.drinksHidden ? "" : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || "Напитки")}</legend><small>${L("serdce.t7", "Можно выбрать несколько вариантов")}</small>${drinks.map(d => `<label><input type="checkbox" name="drinkOptionIds" value="${esc(d.id)}"${r?.chosenDrinks.includes(d.id) ? " checked" : ""}> ${esc(d.title)}</label>`).join("")}</fieldset>`}${r?.extraFields ?? ""}<p class="sc-demo-note" hidden>Ответить можно по именной ссылке из вашего приглашения.</p><button type="submit">${esc(c.buttonLabel || "Отправить")}</button></form>`, ctx.editable);
}

export function renderSerdceBlocks(blocks: InviteBlockView[], _theme: InviteTheme, ctx: Context): string {
  const cover = blocks.find(b => b.type === "COVER");
  const photos = blocks.filter(b => b.type === "PHOTOS" && (b.content as BlockContentMap["PHOTOS"]).tag !== "Дресс-код");
  const storyTexts = blocks.filter(b => b.type === "TEXT" && (b.content as BlockContentMap["TEXT"]).tag === "История");
  let details = 0;
  return blocks.map((block, position) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        return frame(block, "sc-cover", `${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="Пара в поле" fetchpriority="high"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фото пары</span>` : ""}<div class="sc-cover-shade"></div><div class="sc-cover-copy"><h1${e.text("names")}>${esc(c.names)}</h1><p${e.text("title")}>${esc(c.title)}</p><a href="#sc-story">${L("serdce.t9", "Открыть приглашение")}</a></div>`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        if (c.tag === "Дресс-код") return frame(block, "sc-dress-men", `<h3${e.text("title")}>— ${esc(c.title)}</h3>${c.items.map((item, index) => item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption || "Мужские образы")}" loading="lazy"${e.image(`items.${index}.imageUrl`)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Добавить образ</span>` : "").join("")}`, ctx.editable);
        return block.id === photos[0]?.id ? story(block, photos, storyTexts, cover, ctx) : "";
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        if (c.tag === "История") return "";
        if (c.tag === "Детали") {
          const heading = details++ === 0 ? `<h2>${L("serdce.t3", "Детали")}</h2>` : "";
          return frame(block, "sc-detail sc-green", `${heading}<div class="sc-detail-body"><h3${e.text("title")}>— ${esc(c.title)}</h3><p${e.text("text", { multiline: true })}>${esc(c.text)}</p></div>${details === 3 ? `<p class="sc-detail-quote">${L("serdce.t12", "Ты рядом — и этот мир становится теплее.")}</p>` : ""}`, ctx.editable);
        }
        if (c.tag === "Контакты") return frame(block, "sc-contact", `<h2${e.text("tag")}>${esc(c.tag)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><a href="tel:${esc(c.text.match(/\+\d[\d ()-]+/)?.[0]?.replace(/[^\d+]/g, "") ?? "")}">${esc(c.title)} · ${esc(c.text.match(/\+\d[\d ()-]+/)?.[0] ?? "")}</a>`, ctx.editable);
        if (position === blocks.length - 1) return frame(block, "sc-farewell", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text")}>${esc(c.text)}</p>`, ctx.editable);
        return frame(block, "sc-text", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame(block, "sc-program sc-green", `<h2${e.text("title")}>${esc(c.title)}</h2><div class="sc-program-list">${c.items.map((item, index) => `<article><h3><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time> <span${e.text(`items.${index}.title`)}>${esc(item.title)}</span></h3><p${e.text(`items.${index}.note`)}>${esc(item.note)}</p>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить пункт">×</button>` : ""}</article>`).join("")}</div>${ctx.editable ? '<button type="button" class="sc-add" data-block-action="add-detail">+ Добавить пункт</button>' : ""}`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return frame(block, "sc-venue", `<h2${e.text("title")}>${esc(c.title)}</h2><p class="sc-venue-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p><h3${e.text("name")}>${esc(c.name)}</h3><p${e.text("address")}>${esc(c.address)}</p>${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="Площадка торжества" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фото площадки</span>` : ""}${c.mapUrl ? `<a class="sc-map-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.mapLabel || "Открыть карту")} ↗</a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "MAP": {
        const c = block.content as BlockContentMap["MAP"];
        return frame(block, "sc-map-section", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.yandexUrl || c.googleUrl ? `<a href="${esc(c.yandexUrl || c.googleUrl)}" target="_blank" rel="noopener noreferrer">${L("serdce.t8", "Открыть маршрут ↗")}</a>` : ""}${ctx.editable ? e.link("yandexUrl", c.yandexUrl) : ""}`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame(block, "sc-dress", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="sc-swatches">${c.palette.map((color, index) => `<span style="background:${esc(color)}"${e.color(`palette.${index}`)} aria-label="Цвет ${index + 1}"></span>`).join("")}</div><h3>${L("serdce.t15", "— Девушки")}</h3>${c.imageUrl ? `<img class="sc-dress-image" src="${esc(c.imageUrl)}" alt="Образы для гостей" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить примеры нарядов</span>` : ""}`, ctx.editable);
      }
      case "RSVP_FORM": return form(block, ctx);
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        const until = ctx.eventDate?.getTime() ?? new Date("2027-11-20T13:00:00Z").getTime();
        return frame(block, "sc-countdown", `<h2${e.text("title")}>${esc(c.title)}</h2><div class="sc-clock" data-until="${until}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, index) => `<div><strong data-unit="${unit}">00</strong><span>${["Дни", "Часы", "Мин", "Сек"][index]}</span></div>`).join("")}</div><p class="sc-quote">${L("serdce.t11", "Ты моя любовь,")}<br>${L("serdce.t14", "ты всё, что мне надо")}</p>`, ctx.editable);
      }
      default: return "";
    }
  }).join("");
}
