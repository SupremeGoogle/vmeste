/**
 * Форма ответа гостя по именной ссылке: GET рисует, POST принимает.
 * Сама форма — `guest-html/rsvp-page.ts`, общая с ответом по общей ссылке.
 *
 * Токен в адресе — это и есть удостоверение личности гостя (PLAN.md §1.3).
 */
import { tooManyFromClient } from "@/server/rate-limit/client-key";
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { submitRsvp } from "@/server/services/rsvp";
import { setGuestSession } from "@/server/guest-access/session";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { effectiveRsvpQuestions } from "@/server/repositories/rsvp-questions";
import { readRsvpDraft, renderRsvpPage, rsvpSessionExpiry } from "@/server/guest-html/rsvp-page";
import { flashQuery, readFlash } from "@/server/guest-html/flash";

export const dynamic = "force-dynamic";

const notFound = () =>
  html(
    invitePage({
      title: "Не найдено",
      body: "<section><h1>Приглашение не найдено</h1></section>",
      noindex: true,
    }),
    { status: 404 },
  );

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") {
    return notFound();
  }
  const url = new URL(request.url);
  const questions = await effectiveRsvpQuestions(guest.eventId);
  const flash = readFlash(url.searchParams, guest.event.guestLinkSecret);
  const page = await renderRsvpPage(guest, questions, {
    action: `/i/${eventSlug}/${token}/rsvp`,
    back: `/i/${eventSlug}/${token}`,
    pageTitle: guest.displayName,
    error: flash.error,
    message: flash.message,
  });
  return html(page, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const limited = tooManyFromClient(request, "rsvp", 120);
  if (limited) return limited;
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") {
    return notFound();
  }

  const form = await request.formData();
  const questions = await effectiveRsvpQuestions(guest.eventId);
  const draft = readRsvpDraft(form, questions);
  // Стёртое имя не сохраняем: без имени организатор не поймёт, кто ответил.
  const result = draft.guestName === ""
    ? { ok: false as const, reason: "name" as const, message: "" }
    : await submitRsvp(token, draft, questions);

  // Анкета, встроенная в само приглашение, возвращает гостя к ней же,
  // а не на отдельную страницу ответа.
  const inline = form.get("from") === "invite";

  const back = (query: string) =>
    // 303: после POST браузер должен пойти GET-ом, иначе обновление страницы
    // повторно отправит форму.
    new Response(null, {
      status: 303,
      headers: { location: `/i/${eventSlug}/${token}${query}` },
    });

  if (!result.ok) {
    if (!inline) {
      // Форму рисуем сразу с тем, что гость ввёл, — после редиректа все
      // отмеченные ответы пришлось бы выбирать заново.
      const page = await renderRsvpPage(guest, questions, {
        action: `/i/${eventSlug}/${token}/rsvp`,
        back: `/i/${eventSlug}/${token}`,
        pageTitle: guest.displayName,
        error: result.reason, message: result.message, draft,
      });
      return html(page, { status: 422, headers: { "cache-control": "private, no-store" } });
    }
    // Текст ошибки — чтобы гость видел, на какой вопрос не ответил.
    return back(`?${flashQuery(guest.event.guestLinkSecret, result.reason, result.message)}#rsvp`);
  }

  // Гость ответил — значит, ссылка у него. Ставим гостевую сессию: на
  // страницах фото и пожеланий она узнает его без повторного ввода имени.
  await setGuestSession(
    { eventId: guest.eventId, guestId: guest.id },
    guest.event.guestLinkSecret,
    rsvpSessionExpiry(guest.event.eventDate),
  );

  return back(inline ? "?ok=1#rsvp" : "?ok=1");
}
