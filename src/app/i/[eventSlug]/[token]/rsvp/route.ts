/**
 * Форма ответа гостя: GET рисует, POST принимает.
 *
 * Ни строчки клиентского кода. Гость открывает форму с телефона в дороге,
 * и она обязана работать до того, как догрузится любой скрипт, — а раньше
 * ради неё на страницу приезжал весь рантайм React.
 *
 * Отсюда же отказ прятать выбор блюда при «не сможем»: без JS этого не
 * сделать, поэтому блок подписан «если придёте», а сервер эти поля при
 * отказе игнорирует.
 *
 * Токен в адресе — это и есть удостоверение личности гостя (PLAN.md §1.3).
 */
import { findGuestByLinkToken, listMealOptions } from "@/server/repositories/guests";
import { submitRsvp } from "@/server/services/rsvp";
import { setGuestSession } from "@/server/guest-access/session";
import { formatDeadline } from "@/lib/format-datetime";
import { esc, html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { getInviteTheme } from "@/server/repositories/invites";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  deadline: "Срок ответа истёк. Напишите организатору — он отметит вас вручную.",
  invalid: "Проверьте заполнение формы.",
  gone: "Приглашение больше не действует.",
};

/** Докуда живёт гостевая сессия: месяц после свадьбы. Ответ может прийти
 *  и за полгода до неё, поэтому берём более поздний из двух сроков. */
function sessionExpiry(eventDate: Date): Date {
  const afterEvent = new Date(eventDate);
  afterEvent.setDate(afterEvent.getDate() + 30);
  const month = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  return afterEvent > month ? afterEvent : month;
}

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

  const theme = await getInviteTheme(guest.eventId);
  const meals = await listMealOptions(guest.eventId);
  const plusOne = guest.plusOnes[0] ?? null;
  const plusOneAllowed =
    guest.event.allowPlusOne && guest.plusOneAllowed && guest.parentGuestId === null;
  const error = new URL(request.url).searchParams.get("error");
  const answered = guest.rsvpStatus !== "PENDING";
  const deadline = guest.event.rsvpDeadline;

  const choice = (
    name: string,
    value: string,
    label: string,
    checked: boolean,
    required = false,
  ) =>
    `<label class="choice"><input type="radio" name="${name}" value="${esc(value)}"${
      checked ? " checked" : ""
    }${required ? " required" : ""}><span>${esc(label)}</span></label>`;

  const mealFieldset = (name: string, legend: string, selected: string | null) =>
    meals.length === 0
      ? ""
      : `<fieldset><legend>${esc(legend)}</legend>
${meals.map((meal) => choice(name, meal.id, meal.title, selected === meal.id)).join("")}
</fieldset>`;

  const body = `<p class="who">${esc(guest.displayName)}</p>
<section style="padding-bottom:0">
<h1 class="center" style="font-size:1.5rem">${answered ? "Можно изменить ответ" : "Подтвердите присутствие"}</h1>
${deadline ? `<p class="center small muted">до ${esc(formatDeadline(deadline, guest.event.timezone))}</p>` : ""}
</section>
${error ? `<p class="error">${esc(ERRORS[error] ?? ERRORS.invalid)}</p>` : ""}
<form method="post" action="/i/${eventSlug}/${token}/rsvp">
  <fieldset>
    <legend>Придёте?</legend>
    ${choice("status", "ACCEPTED", "Да, будем", guest.rsvpStatus === "ACCEPTED", true)}
    ${choice("status", "DECLINED", "К сожалению, не сможем", guest.rsvpStatus === "DECLINED")}
  </fieldset>

  ${
    plusOneAllowed
      ? `<label class="field"><span>Имя спутника, если придёте вдвоём</span>
<input name="plusOneName" maxlength="120" value="${esc(guest.plusOneName ?? "")}" placeholder="Имя и фамилия">
</label>`
      : ""
  }

  ${mealFieldset("mealOptionId", "Если придёте — что подать на ужин", guest.mealOptionId)}
  ${
    plusOneAllowed
      ? mealFieldset(
          "plusOneMealOptionId",
          "Что подать спутнику — если придёте вдвоём",
          plusOne?.mealOptionId ?? null,
        )
      : ""
  }

  <label class="field"><span>Что-то ещё для организатора</span>
  <textarea name="comment" maxlength="500" rows="3">${esc(guest.comment ?? "")}</textarea></label>

  <button class="submit" type="submit">${answered ? "Сохранить ответ" : "Отправить"}</button>
</form>
<p class="foot"><a href="/i/${eventSlug}/${token}">Вернуться к приглашению</a></p>`;

  return html(invitePage({ title: guest.displayName, theme, body, noindex: true }), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") {
    return notFound();
  }

  const form = await request.formData();
  const result = await submitRsvp(token, {
    status: String(form.get("status") ?? ""),
    mealOptionId: String(form.get("mealOptionId") ?? "") || null,
    comment: String(form.get("comment") ?? ""),
    plusOneName: String(form.get("plusOneName") ?? ""),
    plusOneMealOptionId: String(form.get("plusOneMealOptionId") ?? "") || null,
  });

  const back = (query: string) =>
    // 303: после POST браузер должен пойти GET-ом, иначе обновление страницы
    // повторно отправит форму.
    new Response(null, {
      status: 303,
      headers: { location: `/i/${eventSlug}/${token}${query}` },
    });

  if (!result.ok) return back(`/rsvp?error=${result.reason}`);

  // Гость ответил — значит, ссылка у него. Ставим гостевую сессию: на
  // страницах фото и пожеланий она узнает его без повторного ввода имени.
  await setGuestSession(
    { eventId: guest.eventId, guestId: guest.id },
    guest.event.guestLinkSecret,
    sessionExpiry(guest.event.eventDate),
  );

  return back("?ok=1");
}
