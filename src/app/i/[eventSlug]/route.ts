/**
 * Публичное приглашение — общая ссылка для соцсетей и общего чата.
 *
 * Отдаётся строкой HTML: интерактивности здесь нет вовсе, а рантайм React
 * стоил 174 КБ при 5 КБ собственной разметки.
 *
 * Ответить можно и отсюда: гость пишет своё имя в анкете и появляется в
 * списке гостей отдельной строкой (`/i/{slug}/join`). `?name=` — имя,
 * заранее вписанное организатором в ссылку «для конкретного человека»:
 * оно уже стоит в поле, но гость может его исправить.
 */
import { getInviteBySlug } from "@/server/repositories/invites";
import { formatEventDateTime } from "@/lib/format-datetime";
import { esc, html } from "@/server/guest-html/layout";
import { coupleNames, invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import { guestFeatureLinks } from "@/server/guest-html/guest-feature-links";
import { loadWishlist } from "@/server/guest-html/wishlist";
import { buildInlineRsvp, hasInlineRsvp } from "@/server/guest-html/inline-rsvp";
import { fallbackRsvpSection, withInlineRsvp } from "@/server/guest-html/inline-rsvp-form";
import { RSVP_FIELDS_CSS } from "@/server/guest-html/rsvp-fields";
import { readFlash } from "@/server/guest-html/flash";
import { db } from "@/server/db";
import { themeInLang, withGuestLang } from "@/server/guest-html/guest-lang";
import { parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const invite = await getInviteBySlug(eventSlug);

  if (!invite) {
    return html(invitePage({ title: "Не найдено", body: "<section><h1>Приглашение не найдено</h1></section>" }), {
      status: 404,
    });
  }

  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").trim().slice(0, 120);
  const joinHref = `/i/${eventSlug}/join${name ? `?name=${encodeURIComponent(name)}` : ""}`;
  const lang = parseLang(invite.event.language) ?? "ru";
  const theme = themeInLang(invite.theme, lang);
  const when = formatEventDateTime(invite.event.eventDate, invite.event.timezone, lang);
  const [links, wishlist] = await Promise.all([
    guestFeatureLinks(invite.event.id),
    loadWishlist(invite.event.id, { pageHref: `/i/${eventSlug}/wishlist` }),
  ]);

  const rsvp = hasInlineRsvp(invite.theme.template)
    ? await buildInlineRsvp(invite.event.id, invite.theme.template, {
        name,
        status: "PENDING",
        mealOptionId: null,
        drinkIds: [],
        answers: [],
        musicWish: "",
        plusOneAllowed: invite.event.allowPlusOne,
        comment: "",
        plusOneName: "",
        plusOneMealOptionId: null,
        plusOneDrinkOptionIds: [],
      }, {
        action: `/i/${eventSlug}/join`,
        saved: false,
        closed: Boolean(invite.event.rsvpDeadline && Date.now() > invite.event.rsvpDeadline.getTime()),
        language: lang,
        // Точный текст ошибки — только подписанный (guest-html/flash.ts).
        flash: readFlash(url.searchParams, url.searchParams.has("msg")
          ? (await db.event.findUnique({ where: { id: invite.event.id }, select: { guestLinkSecret: true } }))?.guestLinkSecret ?? null
          : null),
      })
    : null;

  // Имя в ссылке — значит, приглашение адресовано человеку: обращаемся к нему.
  const greeting = name ? `<p class="who">${esc(name)}</p>` : "";

  return html(
    withGuestLang(lang, () => invitePage({
      title: invite.event.title,
      theme,
      extraCss: rsvp ? RSVP_FIELDS_CSS : undefined,
      body: `${rsvp ? "" : greeting}${renderBlocks(invite.blocks, joinHref, null, invite.event.eventDate, theme, invite.event.timezone, { rsvp, wishlist })}${rsvp ? withInlineRsvp(rsvp, false, () => fallbackRsvpSection(invite.blocks)) : ""}${links.length ? `<div class="links">${links.join("")}</div>` : ""}<p class="foot">${when}</p>`,
      script: inviteScript(invite.blocks, theme, coupleNames(invite.blocks, invite.event.title)),
    })),
    {
      headers: {
        // С именем в адресе страница личная — в общий кеш её не кладём.
        "cache-control": name || rsvp?.error
          ? "private, no-store"
          : "public, max-age=60, stale-while-revalidate=86400",
      },
    },
  );
}
