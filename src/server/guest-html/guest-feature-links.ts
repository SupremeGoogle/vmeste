import { db } from "@/server/db";
import { esc } from "@/server/guest-html/layout";
import { makeT, parseLang } from "@/lib/i18n";

/** Сколько пунктов виш-листа показываем внизу приглашения — дальше по кнопке. */
const WISHLIST_PREVIEW = 4;

/** Адрес раздела гостя: по личной ссылке — через неё, иначе — страница по короткому коду. */
function sectionHref(shortCode: string, section: string, guestEntry?: string) {
  return guestEntry ? `${guestEntry}?section=${section}` : `/g/${shortCode}/${section}`;
}

/** Общая навигация во всех шаблонах. Виш-лист — не ссылкой, а своим разделом (`guestWishlistSection`). */
export async function guestFeatureLinks(eventId: string, guestEntry?: string): Promise<string[]> {
  const event = await db.event.findFirst({ where: { id: eventId }, select: { shortCode: true, albumEnabled: true, language: true } });
  if (!event) return [];
  const t = makeT(parseLang(event.language) ?? "ru");
  return [
    ...(event.albumEnabled ? [`<a href="${esc(sectionHref(event.shortCode, "album", guestEntry))}">${t("Альбом со свадьбы", "Wedding photo album")}</a>`] : []),
  ];
}

/**
 * Маленький раздел «Наш виш-лист» внизу приглашения — один для всех
 * шаблонов. Стили лежат в самом разделе и опираются на переменные темы
 * с запасными значениями: у части шаблонов вёрстка своя, и общих классов
 * приглашения там нет.
 */
export async function guestWishlistSection(eventId: string, guestEntry?: string): Promise<string> {
  const event = await db.event.findFirst({
    where: { id: eventId, giftsEnabled: true },
    select: { shortCode: true, giftTransferDetails: true, giftTransferUrl: true, language: true },
  });
  if (!event) return "";
  const t = makeT(parseLang(event.language) ?? "ru");
  const gifts = await db.gift.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    take: WISHLIST_PREVIEW + 1,
    select: { id: true, title: true, imageUrl: true },
  });
  const hasEnvelope = Boolean(event.giftTransferDetails || event.giftTransferUrl);
  if (gifts.length === 0 && !hasEnvelope) return "";

  const items = gifts.slice(0, WISHLIST_PREVIEW).map((gift) => `<li>${
    gift.imageUrl
      ? `<img src="${esc(gift.imageUrl)}" alt="" loading="lazy">`
      : `<span class="vm-wl-dot" aria-hidden="true">♡</span>`
  }<span>${esc(gift.title)}</span></li>`).join("");
  const more = gifts.length > WISHLIST_PREVIEW ? t("Смотреть весь виш-лист", "See the full gift list") : t("Открыть виш-лист", "Open gift list");

  return `<section class="vm-wl" aria-labelledby="vm-wl-title"><style>
.vm-wl{max-width:34rem;margin:2.5rem auto 0;padding:0 1.5rem;text-align:center;font-family:var(--sans,system-ui,sans-serif)}
.vm-wl-box{padding:1.75rem 1.25rem 1.5rem;border:1px solid var(--line,#e6ddd1);border-radius:1.25rem;background:var(--card,#fffdf9);color:var(--fg,#2b2622)}
.vm-wl h2{margin:0;font-family:var(--serif,Georgia,serif);font-weight:400;font-size:1.75rem;line-height:1.15;color:inherit}
.vm-wl p{margin:.5rem 0 0;font-size:.9375rem;color:var(--muted,#7c7168)}
.vm-wl ul{list-style:none;margin:1.25rem 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr));gap:.75rem}
.vm-wl li{display:flex;flex-direction:column;align-items:center;gap:.5rem;font-size:.875rem;line-height:1.3}
.vm-wl li img,.vm-wl-dot{width:100%;aspect-ratio:1;border-radius:.875rem;object-fit:cover;background:var(--line,#efe7dc)}
.vm-wl-dot{display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--muted,#7c7168)}
.vm-wl a{display:inline-block;margin-top:1.25rem;padding:.65rem 1.5rem;border:1px solid var(--line,#d8ccbb);border-radius:999px;color:inherit;text-decoration:none;font-size:.9375rem}
</style><div class="vm-wl-box"><h2 id="vm-wl-title">${t("Наш виш-лист", "Our gift list")}</h2><p>${
    gifts.length > 0 ? t("Если захотите порадовать нас подарком — вот что нам пригодится.", "If you’d like to give us a gift, here are a few things we’d love.") : t("Если захотите поздравить нас подарком — реквизиты здесь.", "If you’d like to give us a gift, the details are here.")
  }</p>${items ? `<ul>${items}</ul>` : ""}<a href="${esc(sectionHref(event.shortCode, "gifts", guestEntry))}">${more}</a></div></section>`;
}
