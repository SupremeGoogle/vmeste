/**
 * Виш-лист внутри приглашения — для любого шаблона.
 *
 * Шапку раздела (метка, заголовок, текст) рисует сам шаблон: виш-лист
 * подаётся ему как текстовый раздел с тем же id, и он выходит в родных
 * шрифтах, цветах и с родными украшениями. Под шапку в тот же раздел
 * вставляется сетка подарков. Она не знает про шаблон ничего: шрифт и
 * цвет наследует от раздела (`inherit`, `currentColor`), поэтому одинаково
 * уместна и в кремовой «Богеме», и в тёмном «Созвездии».
 *
 * Так у всех шаблонов один стандарт: раздел «Виш-лист» есть везде, его
 * слова правятся в редакторе, как любой текст, а подарки ведутся в одном
 * месте.
 */
import QRCode from "qrcode";
import { db } from "@/server/db";
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";
import { editAttrs } from "@/server/guest-html/inline-editor";

export type WishlistGift = {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  taken: boolean;
  mine: boolean;
  /** false — «просто идея»: без брони, подарить может любой. */
  reservable?: boolean;
};

export type WishlistData = {
  gifts: WishlistGift[];
  envelope: { label: string; details: string; url: string; qr: string | null } | null;
  /** Куда отправлять бронь (именная ссылка). null — бронь недоступна. */
  reserveAction: string | null;
  /** Страница подарков, которую открывает кнопка в приглашении. */
  pageHref?: string | null;
  /** Куда вести гостя без именной ссылки, чтобы он мог выбрать подарок. */
  joinHref: string | null;
  /** Сообщение после брони — показывается над сеткой. */
  message: string | null;
  /** Примеры для витрины шаблонов и пустого редактора. */
  sample?: boolean;
  /** Редактор: ссылка на список подарков, чтобы их было где поправить. */
  manageHref?: string;
};

/** Примеры подарков — у витрины и у пустого списка в редакторе. */
export const SAMPLE_WISHLIST: WishlistData = {
  gifts: [
    { id: "sample-1", title: "Кофемашина", description: "Чтобы каждое утро начиналось вместе", url: "", imageUrl: "", taken: false, mine: false },
    { id: "sample-2", title: "Сертификат в путешествие", description: "Мечтаем о море после свадьбы", url: "", imageUrl: "", taken: true, mine: false },
    { id: "sample-3", title: "Набор посуды", description: "Для первых семейных ужинов", url: "", imageUrl: "", taken: false, mine: false },
  ],
  envelope: null,
  reserveAction: null,
  joinHref: null,
  message: null,
  sample: true,
};

export async function loadWishlist(
  eventId: string,
  opts: { guestId?: string | null; reserveAction?: string | null; joinHref?: string | null; message?: string | null; pageHref?: string | null } = {},
): Promise<WishlistData> {
  const [event, gifts] = await Promise.all([
    db.event.findFirst({
      where: { id: eventId },
      select: { giftTransferLabel: true, giftTransferDetails: true, giftTransferUrl: true },
    }),
    db.gift.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: { reservation: { select: { guestId: true } } },
    }),
  ]);
  const hasEnvelope = Boolean(event && (event.giftTransferDetails || event.giftTransferUrl));
  return {
    gifts: gifts.map((gift) => ({
      id: gift.id,
      title: gift.title,
      description: gift.description,
      url: gift.url,
      imageUrl: gift.imageUrl,
      mine: Boolean(opts.guestId) && gift.reservation?.guestId === opts.guestId,
      taken: Boolean(gift.reservation) && gift.reservation?.guestId !== opts.guestId,
      reservable: gift.reservable,
    })),
    envelope: hasEnvelope && event
      ? {
          label: event.giftTransferLabel,
          details: event.giftTransferDetails,
          url: event.giftTransferUrl,
          qr: event.giftTransferUrl ? await QRCode.toDataURL(event.giftTransferUrl, { width: 220, margin: 1 }) : null,
        }
      : null,
    reserveAction: opts.reserveAction ?? null,
    joinHref: opts.joinHref ?? null,
    message: opts.message ?? null,
    pageHref: opts.pageHref ?? null,
  };
}

const CSS = `
.vm-wl{margin:1.75rem auto 0;max-width:34rem;padding:0;font:inherit;color:inherit;text-align:left}
.vm-wl-msg{margin:0 0 1rem;padding:.7rem 1rem;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:.9rem;font-size:.95em;text-align:center}
.vm-wl-grid{list-style:none;margin:0;padding:0;display:grid;gap:.75rem}
.vm-wl-card{display:grid;grid-template-columns:4.75rem 1fr;gap:.9rem;align-items:start;padding:.75rem;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:1rem;background:color-mix(in srgb,currentColor 3%,transparent)}
.vm-wl-card.is-taken{opacity:.55}
.vm-wl-pic{display:block;width:4.75rem;height:4.75rem;border-radius:.75rem;object-fit:cover;background:color-mix(in srgb,currentColor 7%,transparent)}
.vm-wl-pic-empty{display:flex;align-items:center;justify-content:center;font-size:1.6rem;opacity:.6}
.vm-wl-body{display:flex;min-width:0;flex-direction:column;gap:.25rem}
.vm-wl-title{margin:0;font-size:1.02em;line-height:1.3;font-weight:600;letter-spacing:normal;text-transform:none}
.vm-wl-desc{margin:0;font-size:max(.88em,12px);line-height:1.45;opacity:.75}
.vm-wl-link{align-self:flex-start;font-size:.85em;color:inherit;text-decoration:underline;text-underline-offset:3px;opacity:.8}
.vm-wl-state{margin-top:.2rem;font-size:max(.8em,11px);letter-spacing:.06em;text-transform:uppercase;opacity:.6}
.vm-wl form{margin:.35rem 0 0;padding:0;max-width:none}
.vm-wl-btn{display:inline-flex;align-items:center;justify-content:center;min-height:2.5rem;margin:0;padding:.45rem 1.1rem;border:1px solid currentColor;border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:.9em;cursor:pointer;text-decoration:none;width:auto}
.vm-wl-btn.is-mine{border-style:dashed;opacity:.8}
.vm-wl-btn:hover{background:color-mix(in srgb,currentColor 8%,transparent)}
.vm-wl-env{margin-top:1.25rem;padding:1.25rem;border:1px dashed color-mix(in srgb,currentColor 30%,transparent);border-radius:1rem;text-align:center}
.vm-wl-env h3{margin:0 0 .4rem;font-size:1.1em;font-weight:600;text-transform:none;letter-spacing:normal}
.vm-wl-env p{margin:0;white-space:pre-line;font-size:.92em;opacity:.8;overflow-wrap:anywhere}
.vm-wl-env img{display:block;width:8.5rem;height:8.5rem;margin:.9rem auto 0;border-radius:.5rem;background:#fff;padding:.3rem}
.vm-wl-note{margin:1rem 0 0;font-size:max(.85em,12px);opacity:.7;text-align:center}
.vm-wl-teaser{text-align:center}.vm-wl-teaser .vm-wl-btn{min-height:3rem;padding:.7rem 1.8rem;font-size:max(1em,14px);letter-spacing:.02em}.vm-wl-count{margin:.7rem 0 0;font-size:max(.85em,12px);opacity:.65}
.vm-wl-manage{display:block;width:fit-content;margin:1rem auto 0;padding:.45rem .9rem;border:1px dashed #c79a55;border-radius:.5rem;background:#fff8ee;color:#8b6914;font:500 13px/1.3 system-ui,sans-serif;text-decoration:none}
`.replace(/\n/g, "");

function giftCard(gift: WishlistGift, content: BlockContentMap["WISHLIST"], data: WishlistData): string {
  const picture = gift.imageUrl
    ? `<img class="vm-wl-pic" src="${esc(gift.imageUrl)}" alt="" loading="lazy">`
    : `<span class="vm-wl-pic vm-wl-pic-empty" aria-hidden="true">♡</span>`;
  const anyMine = data.gifts.some((item) => item.mine);
  let action = "";
  if (gift.taken) {
    action = `<span class="vm-wl-state">Уже выбрали</span>`;
  } else if (gift.reservable === false && !gift.mine) {
    action = `<span class="vm-wl-state">Можно дарить всем</span>`;
  } else if (data.reserveAction) {
    action = gift.mine
      ? `<form method="post" action="${esc(data.reserveAction)}"><input type="hidden" name="giftId" value="${esc(gift.id)}"><input type="hidden" name="release" value="1"><button class="vm-wl-btn is-mine" type="submit">Это мой подарок · снять</button></form>`
      : anyMine
        ? `<span class="vm-wl-state">Свободен</span>`
        : `<form method="post" action="${esc(data.reserveAction)}"><input type="hidden" name="giftId" value="${esc(gift.id)}"><button class="vm-wl-btn" type="submit">${esc(content.buttonLabel || "Я подарю это")}</button></form>`;
  } else {
    action = `<span class="vm-wl-state">Свободен</span>`;
  }
  return `<li class="vm-wl-card${gift.taken ? " is-taken" : ""}">${picture}<div class="vm-wl-body"><p class="vm-wl-title">${esc(gift.title)}</p>${
    gift.description ? `<p class="vm-wl-desc">${esc(gift.description)}</p>` : ""
  }${gift.url ? `<a class="vm-wl-link" href="${esc(gift.url)}" target="_blank" rel="noopener noreferrer">Где посмотреть ↗</a>` : ""}${action}</div></li>`;
}

/** Сетка подарков и конверт — то, что встаёт под шапку раздела. */
export function wishlistBody(content: BlockContentMap["WISHLIST"], data: WishlistData, editable: boolean): string {
  const gifts = data.gifts.length ? data.gifts : editable || data.sample ? SAMPLE_WISHLIST.gifts : [];
  const grid = gifts.length
    ? `<ul class="vm-wl-grid">${gifts.map((gift) => giftCard(gift, content, data)).join("")}</ul>`
    : "";
  const envelope = data.envelope
    ? `<div class="vm-wl-env"><h3>${esc(content.envelopeTitle || data.envelope.label)}</h3>${
        data.envelope.details ? `<p>${esc(data.envelope.details)}</p>` : ""
      }${data.envelope.url ? `<p style="margin-top:.75rem"><a class="vm-wl-btn" style="width:auto" href="${esc(data.envelope.url)}" target="_blank" rel="noopener noreferrer">Перевести</a></p>` : ""}${
        data.envelope.qr ? `<img src="${data.envelope.qr}" alt="QR-код для перевода">` : ""
      }</div>`
    : "";
  const note = !data.reserveAction && !data.sample && !editable && data.gifts.some((gift) => !gift.taken && gift.reservable !== false)
    ? `<p class="vm-wl-note">${data.joinHref ? `Выбрать подарок можно после ответа на приглашение — <a href="${esc(data.joinHref)}" style="color:inherit">ответить</a>.` : "Выбрать подарок можно по именной ссылке из приглашения."}</p>`
    : "";
  const sampleNote = editable && !data.gifts.length
    ? `<p class="vm-wl-note">Это примеры. Добавьте свои подарки — гости увидят их здесь.</p>`
    : "";
  const manage = editable && data.manageHref
    ? `<a class="vm-wl-manage" data-editor-ui data-editor-nav href="${esc(data.manageHref)}" target="_top">Изменить подарки и реквизиты</a>`
    : "";
  if (!grid && !envelope && !manage) return "";
  return `<div class="vm-wl" id="wishlist"><style>${CSS}</style>${
    data.message ? `<p class="vm-wl-msg" role="status">${esc(data.message)}</p>` : ""
  }${grid}${envelope}${note}${sampleNote}${manage}</div>`;
}

/**
 * Кнопка в приглашении: подарки открываются отдельной страницей
 * (docs/template-standard.md, §8). Пустой список без реквизитов гостю
 * не показываем вовсе.
 */
function wishlistTeaser(blockId: string, content: BlockContentMap["WISHLIST"], data: WishlistData, editable: boolean): string {
  if (!editable && !data.sample && data.gifts.length === 0 && !data.envelope) return "";
  const label = esc(content.openLabel || "Открыть виш-лист");
  const button = editable
    ? `<span class="vm-wl-btn"${editAttrs(blockId, true).text("openLabel")}>${label}</span>`
    : data.pageHref
      ? `<a class="vm-wl-btn" href="${esc(data.pageHref)}">${label}</a>`
      : `<span class="vm-wl-btn">${label}</span>`;
  // «Свободно» считаем только среди тех, что бронируются: идея без брони
  // не бывает ни свободной, ни занятой.
  const bookable = data.gifts.filter((gift) => gift.reservable !== false || gift.taken || gift.mine);
  const free = bookable.filter((gift) => !gift.taken).length;
  const count = data.gifts.length
    ? `<p class="vm-wl-count">Подарков в списке: ${data.gifts.length}${free < bookable.length ? ` · свободно ${free}` : ""}</p>`
    : "";
  const manage = editable && data.manageHref
    ? `<a class="vm-wl-manage" data-editor-ui data-editor-nav href="${esc(data.manageHref)}" target="_top">Изменить подарки и реквизиты</a>`
    : "";
  return `<div class="vm-wl vm-wl-teaser" id="wishlist"><style>${CSS}</style>${button}${count}${manage}</div>`;
}

/** Начало и конец раздела с атрибутом этого блока в готовой разметке. */
function findSection(html: string, blockId: string): { start: number; end: number } | null {
  const id = esc(blockId);
  const open = new RegExp(`<section\\b[^>]*data-(?:content-block|block-id)="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`, "g");
  const match = open.exec(html);
  if (!match) return null;
  const tag = /<(\/?)section\b[^>]*>/g;
  tag.lastIndex = match.index;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return { start: match.index, end: m.index };
  }
  return null;
}

/**
 * Отдать виш-лист шаблону как текстовый раздел и вставить под его шапку
 * сетку подарков. `render` — рендер шаблона.
 */
export function renderWithWishlist(
  blocks: InviteBlockView[],
  render: (blocks: InviteBlockView[]) => string,
  data: WishlistData | null | undefined,
  editable: boolean,
  /** `page` — отдельная страница подарков: под шапкой вся сетка, а не кнопка. */
  mode: "button" | "page" = "button",
): string {
  const wishlists = blocks.filter((block) => block.type === "WISHLIST");
  if (wishlists.length === 0) return render(blocks);

  const asText = blocks.map((block) => {
    if (block.type !== "WISHLIST") return block;
    const c = block.content as BlockContentMap["WISHLIST"];
    return { ...block, type: "TEXT", // `wishlist` — признак для шаблонов, которые склеивают текстовые
    // разделы в общий блок «Детали»: виш-листу нужен свой заголовок.
    content: { v: 1, tag: c.tag, title: c.title, text: c.text, wishlist: true } } as InviteBlockView;
  });
  let html = render(asText);
  for (const block of wishlists) {
    const content = block.content as BlockContentMap["WISHLIST"];
    const source = data ?? { ...SAMPLE_WISHLIST, sample: false, gifts: [] };
    const body = mode === "page" ? wishlistBody(content, source, editable) : wishlistTeaser(block.id, content, source, editable);
    const section = findSection(html, block.id);
    if (section && !body) {
      // Ни подарков, ни реквизитов — заголовок без содержимого гостю ни к чему.
      html = html.slice(0, section.start) + html.slice(section.end + "</section>".length);
    } else if (section) {
      // Сетка — сразу под текстом раздела, а не после украшений, которые
      // шаблон дорисовывает в конце своих текстовых разделов.
      const text = esc(((block.content as BlockContentMap["WISHLIST"]).text.split("\n")[0] ?? "").trim());
      const at = text ? html.indexOf(text, section.start) : -1;
      const close = at >= 0 && at < section.end ? html.indexOf("</p>", at) : -1;
      const point = close >= 0 && close < section.end ? close + "</p>".length : section.end;
      html = html.slice(0, point) + body + html.slice(point);
    } else if (body) {
      html += `<section class="vm-wl-standalone" style="padding:2.5rem 1.5rem">${body}</section>`;
    }
  }
  return html;
}
