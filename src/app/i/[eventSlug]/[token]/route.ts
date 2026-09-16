/**
 * Именное приглашение.
 *
 * Мероприятие определяется по токену, а не по слагу в адресе: слаг
 * уникален внутри организации, и две свадьбы могут оказаться `ivanovy`.
 * Слаг здесь только для читаемости — если он не совпал с тем, что у
 * мероприятия гостя, это 404, а не «покажем другое».
 */
import { findGuestByLinkToken, listDrinkOptions, markLinkOpened } from "@/server/repositories/guests";
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

  // «Тили-тесто» — анкета прямо на странице, как в образце. Всё, чего в
  // ней нет (блюдо, спутник, комментарий), уходит скрытыми полями как было:
  // иначе ответ из этой анкеты молча стёр бы выбор, сделанный раньше.
  if (theme.template === "tili") {
    const plusOne = guest.plusOnes[0] ?? null;
    const drinks = await listDrinkOptions(guest.eventId);
    const rsvp = {
      action: rsvpHref,
      guestName: guest.displayName,
      status: guest.rsvpStatus,
      drinks,
      chosenDrinks: guest.drinks.map((row) => row.drinkOptionId),
      musicWish: guest.musicWish ?? "",
      keep: {
        mealOptionId: guest.mealOptionId,
        comment: guest.comment ?? "",
        plusOneName: guest.plusOneName ?? "",
        plusOneMealOptionId: plusOne?.mealOptionId ?? null,
        plusOneDrinkOptionIds: plusOne?.drinks.map((row) => row.drinkOptionId) ?? [],
      },
      saved: Boolean(saved),
      error: url.searchParams.get("error"),
    };
    const links = [
      guest.event.photosEnabled ? `<a href="/i/${eventSlug}/${token}/photos">Фотографии со свадьбы</a>` : "",
      guest.event.wishesEnabled ? `<a href="/i/${eventSlug}/${token}/wish">Написать пожелание</a>` : "",
    ].filter(Boolean);
    return html(invitePage({
      title: guest.event.title,
      theme,
      noindex: true,
      body: `${renderBlocks(blocks, rsvpHref, answered, guest.event.eventDate, theme, guest.event.timezone, { rsvp })}${
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
    guest.event.photosEnabled
      ? `<a href="/i/${eventSlug}/${token}/photos">Фотографии со свадьбы</a>`
      : "",
    guest.event.wishesEnabled
      ? `<a href="/i/${eventSlug}/${token}/wish">Написать пожелание</a>`
      : "",
  ].filter(Boolean);

  const body = `${banner}
<p class="who">${esc(guest.displayName)}</p>
${renderBlocks(blocks, rsvpHref, answered, guest.event.eventDate, theme, guest.event.timezone)}
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
