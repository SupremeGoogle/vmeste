/**
 * Анкета прямо в приглашении — общая для шаблонов, у которых своей нет
 * (docs/template-standard.md, §2).
 *
 * Шапку раздела (метка, заголовок, текст) рисует шаблон в своём стиле, а
 * сама форма не знает про шаблон ничего: шрифт и цвет наследует от раздела
 * (`inherit`, `currentColor`) — как сетка виш-листа. Раньше на этом месте у
 * «Рубина», «Жемчуга», «Тосканы» и «Созвездия» был нарисованный образ
 * формы и кнопка на отдельную страницу.
 *
 * Данные анкеты (кто отвечает, его прежний ответ, напитки, куда слать)
 * собирает маршрут (`buildInlineRsvp`) и кладёт на время рендера сюда: рендеры
 * шаблонов синхронные, и протягивать анкету через их функции незачем.
 * Без данных (витрина, редактор) форма показывается как образец.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { L } from "@/server/guest-html/template-labels";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";

type Rsvp = TiliRsvp & { plusOneAllowed?: boolean };

let current: { rsvp: Rsvp | null; editable: boolean } = { rsvp: null, editable: false };

export function withInlineRsvp<T>(rsvp: Rsvp | null | undefined, editable: boolean, render: () => T): T {
  const previous = current;
  current = { rsvp: rsvp ?? null, editable };
  try {
    return render();
  } finally {
    current = previous;
  }
}

const SAMPLE_DRINKS = [
  { id: "sample-red", title: "Красное вино" }, { id: "sample-white", title: "Белое вино" },
  { id: "sample-sparkling", title: "Игристое" }, { id: "sample-strong", title: "Крепкое" },
  { id: "sample-soft", title: "Безалкогольное" },
];

export const INLINE_RSVP_FORM_CSS = `
.vm-rsvp{max-width:32rem;margin:1.75rem auto 0;padding:0;text-align:left;font:inherit;color:inherit}
.vm-rsvp fieldset{margin:0 0 1.4rem;padding:0;border:0;min-width:0}
.vm-rsvp legend,.vm-rsvp-label{display:block;margin:0 0 .6rem;color:inherit;font-family:inherit;font-size:.95em;font-weight:600;letter-spacing:normal;text-transform:none}
.vm-rsvp-hint{display:block;margin:-.35rem 0 .6rem;font-size:.8em;opacity:.65}
.vm-rsvp-choice{display:flex;align-items:center;gap:.7rem;margin:0 0 .5rem;padding:.8rem 1rem;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:.9rem;background:color-mix(in srgb,currentColor 3%,transparent);cursor:pointer;font-size:.95em;line-height:1.3}
.vm-rsvp-choice:has(input:checked){border-color:currentColor;background:color-mix(in srgb,currentColor 8%,transparent)}
.vm-rsvp-choice input{flex:none;width:1.1rem;height:1.1rem;margin:0;accent-color:currentColor}
.vm-rsvp-drinks{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:.5rem}
.vm-rsvp-drinks .vm-rsvp-choice{margin:0}
.vm-rsvp-field{display:block;margin:0 0 1.4rem}
.vm-rsvp-field input,.vm-rsvp-field textarea{display:block;box-sizing:border-box;width:100%;padding:.85rem 1rem;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:.9rem;background:color-mix(in srgb,#fff 70%,transparent);color:#2b2622;font:inherit;font-size:1rem;outline:none}
.vm-rsvp-field input:focus,.vm-rsvp-field textarea:focus{border-color:currentColor}
.vm-rsvp-submit{display:flex;align-items:center;justify-content:center;width:100%;min-height:3.2rem;margin:.4rem 0 0;padding:.8rem 1.4rem;border:1.5px solid currentColor;border-radius:999px;background:color-mix(in srgb,currentColor 10%,transparent);color:inherit;cursor:pointer;font:inherit;font-weight:600;letter-spacing:.04em;transition:background-color .2s}
.vm-rsvp-submit:hover{background:color-mix(in srgb,currentColor 18%,transparent)}
.vm-rsvp-msg{margin:0 0 1.2rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:.9rem;text-align:center}
.vm-rsvp-error{border-style:dashed}
.vm-rsvp-note{margin:.8rem 0 0;font-size:.82em;opacity:.65;text-align:center}
.vm-rsvp-manage{display:block;width:fit-content;margin:1rem auto 0;padding:.5rem 1rem;border:1px dashed #c79a55;border-radius:.5rem;background:#fff8ee;color:#8b6914;font:500 13px/1.3 system-ui,sans-serif;cursor:pointer}
`.replace(/\n/g, "");

/**
 * Форма для раздела «Анкета» — то, что встаёт под шапку раздела.
 * Отвечает именной ссылкой, общей (`/i/{slug}/join`) или показывается образцом.
 */
export function inlineRsvpForm(block: InviteBlockView): string {
  const c = block.content as BlockContentMap["RSVP_FORM"];
  const e = editAttrs(block.id, current.editable);
  const r = current.rsvp;
  const action = r?.action ?? "";
  const plusOneAllowed = r ? r.plusOneAllowed ?? false : true;
  const drinks = r ? r.drinks : SAMPLE_DRINKS;
  const hidden = (name: string, value: string | null) => (value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "");
  const keep = r
    ? [
        hidden("mealOptionId", r.keep.mealOptionId),
        hidden("comment", r.keep.comment),
        hidden("plusOneMealOptionId", r.keep.plusOneMealOptionId),
        ...r.keep.plusOneDrinkOptionIds.map((id) => hidden("plusOneDrinkOptionIds", id)),
      ].join("")
    : "";
  const answered = r && r.status !== "PENDING";
  const saved = r?.saved
    ? `<p class="vm-rsvp-msg" role="status"${e.text("successText", { multiline: true })}>${esc(c.successText || "Спасибо! Ваш ответ получен.")}</p>`
    : current.editable
      ? `<p class="vm-rsvp-msg"${e.text("successText", { multiline: true })}>${esc(c.successText || "Спасибо! Ваш ответ получен.")}</p>`
      : "";
  const error = r?.error ? `<p class="vm-rsvp-msg vm-rsvp-error" role="alert">${esc(r.errorText ?? "Проверьте анкету: заполнены ли имя и ответ.")}</p>` : "";
  const status = r?.status ?? "PENDING";
  const choice = (value: string, label: string, checked: boolean, attrs = "") =>
    `<label class="vm-rsvp-choice"><input type="radio" name="status" value="${value}"${checked ? " checked" : ""}${value === "ACCEPTED" ? " required" : ""}> <span${attrs}>${esc(label)}</span></label>`;

  const drinkField = r?.drinksHidden
    ? ""
    : `<fieldset><legend${e.text("drinksLabel")}>${esc(c.drinksLabel || "Что будете пить?")}</legend>${L("rsvp.drinks-hint", "Можно выбрать несколько вариантов", { tag: "span", className: "vm-rsvp-hint" })}<div class="vm-rsvp-drinks">${drinks
        .map((drink) => `<label class="vm-rsvp-choice"><input type="checkbox" name="drinkOptionIds" value="${esc(drink.id)}"${r?.chosenDrinks.includes(drink.id) ? " checked" : ""}> <span>${esc(drink.title)}</span></label>`)
        .join("")}</div></fieldset>`;

  return `<style>${INLINE_RSVP_FORM_CSS}</style>${saved}${error}<form class="vm-rsvp" method="post"${action ? ` action="${esc(action)}"` : ' data-demo="true" onsubmit="return false"'}>
<input type="hidden" name="from" value="invite">${keep}
<label class="vm-rsvp-field"><span class="vm-rsvp-label"${e.text("nameLabel")}>${esc(c.nameLabel || "Ваше имя и фамилия")}</span><input type="text" name="guestName" value="${esc(r?.guestName ?? "")}" placeholder="Имя и фамилия" maxlength="120" autocomplete="name" required></label>
<fieldset><legend${e.text("attendanceLabel")}>${esc(c.attendanceLabel || "Сможете ли вы прийти?")}</legend>${choice("ACCEPTED", c.yesLabel || "Да, с радостью приду", status === "ACCEPTED", e.text("yesLabel"))}${choice("DECLINED", c.noLabel || "К сожалению, не смогу", status === "DECLINED", e.text("noLabel"))}</fieldset>
${plusOneAllowed ? `<label class="vm-rsvp-field">${L("rsvp.plus-one", "Если придёте вдвоём — имя спутника", { tag: "span", className: "vm-rsvp-label" })}<input type="text" name="plusOneName" value="${esc(r?.keep.plusOneName ?? "")}" placeholder="Имя и фамилия" maxlength="120"></label>` : ""}
${drinkField}${r?.questionFields ?? r?.extraFields ?? ""}
<button type="submit" class="vm-rsvp-submit"><span${answered ? "" : e.text("buttonLabel")}>${esc(answered ? "Изменить ответ" : c.buttonLabel || "Отправить ответ")}</span></button>
${!action && !current.editable ? `<p class="vm-rsvp-note">${L("rsvp.demo-note", "Это образец анкеты — гости ответят по ссылке из приглашения.")}</p>` : ""}
</form>${current.editable ? `<button type="button" class="vm-rsvp-manage" data-editor-ui data-rsvp-builder>Настроить вопросы анкеты</button>` : ""}`;
}

/**
 * Запасная анкета: у приглашения нет видимого раздела «Анкета» (удалили,
 * скрыли или его не было в старом шаблоне), а гостю всё равно нужно как-то
 * ответить. Раньше на этот случай была кнопка «Ответить на приглашение».
 */
export function fallbackRsvpSection(blocks: InviteBlockView[]): string {
  if (blocks.some((block) => block.type === "RSVP_FORM" && block.visible)) return "";
  const block = {
    id: "rsvp-fallback",
    type: "RSVP_FORM",
    order: 9999,
    visible: true,
    degraded: false,
    content: {
      v: 1, tag: "", title: "Подтвердите присутствие", text: "", buttonLabel: "Отправить ответ",
      nameLabel: "", attendanceLabel: "", yesLabel: "", noLabel: "", drinksLabel: "", musicLabel: "",
      musicPlaceholder: "", successText: "",
    },
  } as InviteBlockView;
  return `<section class="vm-rsvp-fallback" id="rsvp" style="padding:2.5rem 1.5rem;text-align:center"><h2>Подтвердите присутствие</h2>${inlineRsvpForm(block)}</section>`;
}
