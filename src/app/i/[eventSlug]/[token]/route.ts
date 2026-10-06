/**
 * Именное приглашение.
 *
 * Мероприятие определяется по токену, а не по слагу в адресе: слаг
 * уникален внутри организации, и две свадьбы могут оказаться `ivanovy`.
 * Слаг здесь только для читаемости — если он не совпал с тем, что у
 * мероприятия гостя, это 404, а не «покажем другое».
 */
import { findGuestByLinkToken, markLinkOpened } from "@/server/repositories/guests";
import { RSVP_FIELDS_CSS } from "@/server/guest-html/rsvp-fields";
import { readFlash } from "@/server/guest-html/flash";
import { parseStoredAnswers } from "@/lib/rsvp-form";
import { guestFeatureLinks } from "@/server/guest-html/guest-feature-links";
import { loadWishlist } from "@/server/guest-html/wishlist";
import { buildInlineRsvp, hasInlineRsvp } from "@/server/guest-html/inline-rsvp";
import { fallbackRsvpSection, withInlineRsvp } from "@/server/guest-html/inline-rsvp-form";
import { getInviteBlocks, getInviteTheme } from "@/server/repositories/invites";
import { formatDeadline, formatEventDateTime } from "@/lib/format-datetime";
import { esc, html } from "@/server/guest-html/layout";
import { coupleNames, invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";

export const dynamic = "force-dynamic";

const ANSWER: Record<string, string> = {
  ACCEPTED: "придём",
  DECLINED: "не сможем быть",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);

  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") {
    return html(invitePage({ title: "Не найдено", body: "<section><h1>Приглашение не найдено</h1></section>", noindex: true }), {
      status: 404,
    });
  }

  // Отметка «ссылка дошла» не должна задерживать отрисовку.
  void markLinkOpened(guest.eventId, guest.id).catch(() => {});

  const [blocks, theme] = await Promise.all([
    getInviteBlocks(guest.eventId),
    getInviteTheme(guest.eventId),
  ]);
  const rsvpHref = `/i/${eventSlug}/${token}/rsvp`;
  const answered = guest.rsvpStatus === "PENDING" ? null : ANSWER[guest.rsvpStatus];
  const url = new URL(request.url);
  const saved = url.searchParams.get("ok");
  const deadline = guest.event.rsvpDeadline;
  const guestEntry = `/i/${eventSlug}/${token}/guest`;
  const [featureLinks, wishlist] = await Promise.all([
    guestFeatureLinks(guest.eventId, guestEntry),
    loadWishlist(guest.eventId, { guestId: guest.id, pageHref: `/i/${eventSlug}/${token}/wishlist` }),
  ]);

  // «Тили-тесто» — анкета прямо на странице, как в образце. Всё, чего в
  // ней нет (блюдо, спутник, комментарий), уходит скрытыми полями как было:
  // иначе ответ из этой анкеты молча стёр бы выбор, сделанный раньше.
  if (hasInlineRsvp(theme.template)) {
    const plusOne = guest.plusOnes[0] ?? null;
    const rsvp = await buildInlineRsvp(guest.eventId, theme.template, {
      name: guest.displayName,
      status: guest.rsvpStatus,
      mealOptionId: guest.mealOptionId,
      drinkIds: guest.drinks.map((row) => row.drinkOptionId),
      answers: parseStoredAnswers(guest.rsvpAnswers),
      musicWish: guest.musicWish ?? "",
      plusOneAllowed: guest.event.allowPlusOne && guest.plusOneAllowed && guest.parentGuestId === null,
      comment: guest.comment ?? "",
      plusOneName: guest.plusOneName ?? "",
      plusOneMealOptionId: plusOne?.mealOptionId ?? null,
      plusOneDrinkOptionIds: plusOne?.drinks.map((row) => row.drinkOptionId) ?? [],
    }, {
      action: rsvpHref,
      saved: Boolean(saved),
      closed: Boolean(deadline && Date.now() > deadline.getTime()),
      flash: readFlash(url.searchParams, guest.event.guestLinkSecret),
    });
    const links = [
      ...featureLinks,
      guest.event.photosEnabled ? `<a href="/i/${eventSlug}/${token}/photos">Фотографии со свадьбы</a>` : "",
      guest.event.wishesEnabled ? `<a href="/i/${eventSlug}/${token}/wish">Написать пожелание</a>` : "",
    ].filter(Boolean);
    return html(invitePage({
      title: guest.event.title,
      theme,
      noindex: true,
      extraCss: RSVP_FIELDS_CSS,
      body: `${renderBlocks(blocks, rsvpHref, answered, guest.event.eventDate, theme, guest.event.timezone, { rsvp, wishlist })}${withInlineRsvp(rsvp, false, () => fallbackRsvpSection(blocks))}${
        links.length > 0 ? `<div class="links">${links.join("")}</div>` : ""
      }<p class="foot">${formatEventDateTime(guest.event.eventDate, guest.event.timezone)}</p>`,
      script: inviteScript(blocks, theme, coupleNames(blocks, guest.event.title)),
    }), { headers: { "cache-control": "private, no-store" } });
  }

  // Гость возвращается на верх длинной страницы, а его ответ показан внизу,
  // в блоке формы. Без этой полосы отправка выглядит как «ничего не произошло».
  const banner = saved
    ? `<p class="ok">Спасибо, ответ записан${answered ? `: ${esc(answered)}` : ""}</p>`
    : "";

  const extras = [
    ...featureLinks,
    guest.event.photosEnabled
      ? `<a href="/i/${eventSlug}/${token}/photos">Фотографии со свадьбы</a>`
      : "",
    guest.event.wishesEnabled
      ? `<a href="/i/${eventSlug}/${token}/wish">Написать пожелание</a>`
      : "",
  ].filter(Boolean);

  const body = `${banner}
<p class="who">${esc(guest.displayName)}</p>
${renderBlocks(blocks, rsvpHref, answered, guest.event.eventDate, theme, guest.event.timezone, { wishlist })}
${
  blocks.some((block) => block.type === "RSVP_FORM")
    ? ""
    : `<section class="center"><a class="cta" href="${rsvpHref}">${
        answered ? "Изменить ответ" : "Ответить на приглашение"
      }</a></section>`
}
${extras.length > 0 ? `<div class="links">${extras.join("")}</div>` : ""}
<p class="foot">${formatEventDateTime(guest.event.eventDate, guest.event.timezone)}
${deadline ? `<br>Ответ ждём до ${formatDeadline(deadline, guest.event.timezone)}` : ""}</p>`;

  return html(invitePage({
      title: guest.event.title,
      theme,
      body,
      noindex: true,
      script: inviteScript(blocks, theme, coupleNames(blocks, guest.event.title)),
    }), {
    headers: { "cache-control": "private, no-store" },
  });
}
