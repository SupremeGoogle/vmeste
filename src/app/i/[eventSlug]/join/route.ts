/**
 * Ответ по общей ссылке: гость вписывает себя сам.
 *
 * Общую ссылку `/i/{slug}` пара кидает в общий чат или отправляет тем, кого
 * не успела завести в список. Гость открывает приглашение, пишет своё имя
 * в анкете — и появляется у организатора отдельной строкой с пометкой
 * «добавился сам». Дальше он ничем не отличается от остальных: у него своя
 * именная ссылка, на которую мы его и уводим после ответа, — по ней он
 * поменяет ответ, не создавая второго себя.
 *
 * Повторная отправка с того же телефона не плодит двойников: гостевая
 * сессия ставится сразу при создании, и второй ответ обновляет того же
 * гостя. `?name=` в адресе — имя, заранее вписанное организатором в
 * ссылку «для конкретного человека»; гость может его исправить.
 */
import { db } from "@/server/db";
import { newGuestData } from "@/server/repositories/guests";
import { submitRsvp } from "@/server/services/rsvp";
import { readGuestSession, setGuestSession } from "@/server/guest-access/session";
import { rateLimit } from "@/server/rate-limit";
import { clientAddress } from "@/server/rate-limit/client-key";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { effectiveRsvpQuestions } from "@/server/repositories/rsvp-questions";
import { readRsvpDraft, renderRsvpPage, rsvpSessionExpiry, type RsvpSubject } from "@/server/guest-html/rsvp-page";
import { flashQuery, readFlash } from "@/server/guest-html/flash";
import { SELF_REGISTRATION_CAP, samePerson, selfRegistrationNameProblem } from "@/server/services/self-registration";
import { parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Потолок самозаписи: за одним wi-fi может сидеть вся свадьба, поэтому
 *  с адреса — щедро, а на мероприятие целиком — против скриптового спама. */
const PER_CLIENT = { limit: 40, windowMs: 10 * 60_000 };
const PER_EVENT = { limit: 400, windowMs: 60 * 60_000 };

const notFound = () =>
  html(
    invitePage({ title: "Не найдено", body: "<section><h1>Приглашение не найдено</h1></section>", noindex: true }),
    { status: 404 },
  );

async function findPublicEvent(slug: string) {
  return db.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    orderBy: { eventDate: "asc" },
    select: {
      id: true, orgId: true, title: true, eventDate: true, timezone: true,
      rsvpDeadline: true, allowPlusOne: true, guestLinkSecret: true, language: true,
    },
  });
}

type PublicEvent = NonNullable<Awaited<ReturnType<typeof findPublicEvent>>>;

/** Будущий гость: пустая анкета с тем именем, что пришло в ссылке. */
function blankSubject(event: PublicEvent, name: string): RsvpSubject {
  return {
    eventId: event.id,
    event: { timezone: event.timezone, rsvpDeadline: event.rsvpDeadline, allowPlusOne: event.allowPlusOne, language: event.language },
    displayName: name,
    rsvpStatus: "PENDING",
    mealOptionId: null,
    drinks: [],
    plusOnes: [],
    plusOneAllowed: event.allowPlusOne,
    parentGuestId: null,
    plusOneName: null,
    comment: null,
    musicWish: null,
    rsvpAnswers: [],
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const event = await findPublicEvent(eventSlug);
  if (!event) return notFound();
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").trim().slice(0, 120);
  const questions = await effectiveRsvpQuestions(event.id);
  const page = await renderRsvpPage(blankSubject(event, name), questions, {
    action: `/i/${eventSlug}/join`,
    back: `/i/${eventSlug}${name ? `?name=${encodeURIComponent(name)}` : ""}`,
    pageTitle: event.title,
    ...readFlash(url.searchParams, event.guestLinkSecret),
  });
  return html(page, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const event = await findPublicEvent(eventSlug);
  if (!event) return notFound();

  const form = await request.formData();
  const questions = await effectiveRsvpQuestions(event.id);
  const draft = readRsvpDraft(form, questions);
  const inline = form.get("from") === "invite";
  const name = draft.guestName ?? "";

  const fail = async (error: string, message = "") => {
    if (inline) {
      // Текст — подписанный: без подписи страница показала бы только общий.
      const query = flashQuery(event.guestLinkSecret, error, message);
      if (name) query.set("name", name);
      return new Response(null, { status: 303, headers: { location: `/i/${eventSlug}?${query}#rsvp` } });
    }
    const page = await renderRsvpPage(blankSubject(event, name), questions, {
      action: `/i/${eventSlug}/join`,
      back: `/i/${eventSlug}`,
      pageTitle: event.title,
      error, message, draft,
    });
    return html(page, { status: 422, headers: { "cache-control": "private, no-store" } });
  };

  const nameProblem = selfRegistrationNameProblem(name, parseLang(event.language) ?? "ru");
  if (nameProblem) return fail(name ? "invalid" : "name", name ? nameProblem : "");
  // Срок вышел — не заводим гостя, который всё равно не сможет ответить.
  if (event.rsvpDeadline && Date.now() > event.rsvpDeadline.getTime()) return fail("deadline");

  const address = clientAddress(request);
  if (
    !rateLimit(`join:${event.id}:${address}`, PER_CLIENT.limit, PER_CLIENT.windowMs).ok ||
    !rateLimit(`join:${event.id}:all`, PER_EVENT.limit, PER_EVENT.windowMs).ok
  ) {
    return fail("limit");
  }

  // Тот же телефон уже отвечал — обновляем того же гостя, а не заводим
  // второго. Но только если и имя его: телефоном часто пользуется вся
  // семья, и ответ мужа не должен лечь поверх ответа жены.
  const session = await readGuestSession(event.id, event.guestLinkSecret);
  const sessionGuest = session
    ? await db.guest.findFirst({
        where: { id: session.guestId, eventId: event.id, archivedAt: null },
        select: { id: true, linkToken: true, displayName: true },
      })
    : null;
  const known = sessionGuest && samePerson(sessionGuest.displayName, name) ? sessionGuest : null;

  if (!known && (await db.guest.count({ where: { eventId: event.id, selfRegistered: true } })) >= SELF_REGISTRATION_CAP) {
    return fail("limit");
  }

  const guest = known ?? await db.guest.create({
    data: {
      ...newGuestData({ orgId: event.orgId, eventId: event.id }, { displayName: name, plusOneAllowed: event.allowPlusOne, note: "Добавился сам по общей ссылке" }),
      selfRegistered: true,
    },
    select: { id: true, linkToken: true },
  });

  // Сессия — сразу, ещё до проверки анкеты: если в ней ошибка, повторная
  // отправка найдёт этого же гостя.
  await setGuestSession({ eventId: event.id, guestId: guest.id }, event.guestLinkSecret, rsvpSessionExpiry(event.eventDate));

  const result = await submitRsvp(guest.linkToken, draft, questions, parseLang(event.language) ?? "ru");
  const personal = `/i/${eventSlug}/${guest.linkToken}`;
  if (!result.ok) {
    // Гость уже заведён — дальше он правит ответ по своей именной ссылке.
    const query = flashQuery(event.guestLinkSecret, result.reason, result.message);
    return new Response(null, {
      status: 303,
      headers: { location: inline ? `${personal}?${query}#rsvp` : `${personal}/rsvp?${query}` },
    });
  }
  return new Response(null, { status: 303, headers: { location: inline ? `${personal}?ok=1#rsvp` : `${personal}?ok=1` } });
}
