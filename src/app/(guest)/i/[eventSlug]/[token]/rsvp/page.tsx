/**
 * Форма ответа гостя.
 *
 * Обычная форма с Server Action и без единого клиентского обработчика:
 * гость открывает её с телефона в дороге, и она обязана работать до того,
 * как догрузится любой скрипт. Отсюда же — никакого «скрыть выбор блюда,
 * если выбрано „не сможем“»: без JS этого не сделать, поэтому блок про
 * застолье просто подписан «если придёте», а сервер игнорирует эти поля
 * при отказе.
 *
 * Токен в адресе — это и есть удостоверение личности гостя, отдельного
 * входа нет (PLAN.md §1.3).
 */
import { notFound, redirect } from "next/navigation";
import { findGuestByLinkToken, listMealOptions } from "@/server/repositories/guests";
import { submitRsvp } from "@/server/services/rsvp";
import { setGuestSession } from "@/server/guest-access/session";
import { formatDeadline } from "@/lib/format-datetime";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventSlug: string; token: string }>;
  searchParams: Promise<{ error?: string }>;
};

/**
 * Докуда живёт гостевая сессия: месяц после свадьбы — за это время гость
 * успевает посмотреть фотогалерею и не успевает забыть, что вообще был.
 * Ответ приходит и за полгода до события, поэтому берём более поздний
 * из двух сроков. Вынесено из компонента: вычисление времени внутри
 * рендера — нечистая функция, и линтер React справедливо на это ругается.
 */
function sessionExpiry(eventDate: Date): Date {
  const afterEvent = new Date(eventDate);
  afterEvent.setDate(afterEvent.getDate() + 30);
  const month = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  return afterEvent > month ? afterEvent : month;
}

const ERRORS: Record<string, string> = {
  deadline: "Срок ответа истёк. Напишите организатору — он отметит вас вручную.",
  invalid: "Проверьте заполнение формы.",
  gone: "Приглашение больше не действует.",
};

export default async function RsvpPage({ params, searchParams }: Props) {
  const { eventSlug, token } = await params;
  const { error } = await searchParams;

  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") notFound();

  const meals = await listMealOptions(guest.eventId);
  // Спутник уже мог быть заведён прошлым ответом — тогда подставляем
  // его блюдо, чтобы гость не выбирал заново.
  const plusOne = guest.plusOnes[0] ?? null;
  const plusOneAllowed =
    guest.event.allowPlusOne && guest.plusOneAllowed && guest.parentGuestId === null;
  const deadline = guest.event.rsvpDeadline;

  async function answer(formData: FormData) {
    "use server";

    const current = await findGuestByLinkToken(token);
    if (!current) notFound();

    const result = await submitRsvp(token, {
      status: String(formData.get("status") ?? ""),
      mealOptionId: String(formData.get("mealOptionId") ?? "") || null,
      allergies: String(formData.get("allergies") ?? ""),
      comment: String(formData.get("comment") ?? ""),
      plusOneName: String(formData.get("plusOneName") ?? ""),
      plusOneMealOptionId: String(formData.get("plusOneMealOptionId") ?? "") || null,
    });

    if (!result.ok) {
      redirect(`/i/${eventSlug}/${token}/rsvp?error=${result.reason}`);
    }

    // Гость ответил — значит, ссылка точно у него. Ставим гостевую сессию:
    // на этапах 5–7 по ней узнаются его фото и пожелания, и второй раз
    // вводить имя ему уже не придётся (PLAN.md §4.3).
    await setGuestSession(
      { eventId: current.eventId, guestId: current.id },
      current.event.guestLinkSecret,
      sessionExpiry(current.event.eventDate),
    );

    redirect(`/i/${eventSlug}/${token}?ok=1`);
  }

  const answered = guest.rsvpStatus !== "PENDING";

  return (
    <main className="mx-auto max-w-lg bg-white px-6 py-10 shadow-sm">
      <h1 className="text-center text-2xl">{guest.displayName}</h1>
      <p className="mt-2 text-center text-sm text-stone-500">
        {answered ? "Можно изменить ответ" : "Подтвердите присутствие"}
        {deadline ? ` · до ${formatDeadline(deadline, guest.event.timezone)}` : ""}
      </p>

      {error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {ERRORS[error] ?? ERRORS.invalid}
        </p>
      ) : null}

      <form action={answer} className="mt-8 space-y-8">
        <fieldset>
          <legend className="text-sm text-stone-500">Придёте?</legend>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-3 rounded-xl border border-stone-300 px-4 py-3">
              <input
                type="radio" name="status" value="ACCEPTED" required
                defaultChecked={guest.rsvpStatus === "ACCEPTED"}
              />
              <span>Да, будем</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-stone-300 px-4 py-3">
              <input
                type="radio" name="status" value="DECLINED"
                defaultChecked={guest.rsvpStatus === "DECLINED"}
              />
              <span>К сожалению, не сможем</span>
            </label>
          </div>
        </fieldset>

        {plusOneAllowed ? (
          <label className="block">
            <span className="text-sm text-stone-500">
              Имя спутника, если придёте вдвоём
            </span>
            <input
              name="plusOneName" maxLength={120} defaultValue={guest.plusOneName ?? ""}
              placeholder="Имя и фамилия"
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"
            />
            <span className="mt-1 block text-xs text-stone-400">
              Оставьте пустым, если придёте один.
            </span>
          </label>
        ) : null}

        {meals.length > 0 ? (
          <fieldset>
            <legend className="text-sm text-stone-500">Если придёте — что подать на ужин</legend>
            <div className="mt-3 space-y-2">
              {meals.map((meal) => (
                <label
                  key={meal.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-300 px-4 py-3"
                >
                  <input
                    type="radio" name="mealOptionId" value={meal.id}
                    defaultChecked={guest.mealOptionId === meal.id}
                  />
                  <span>{meal.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {meals.length > 0 && plusOneAllowed ? (
          <fieldset>
            <legend className="text-sm text-stone-500">
              Что подать спутнику — если придёте вдвоём
            </legend>
            <div className="mt-3 space-y-2">
              {meals.map((meal) => (
                <label
                  key={meal.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-300 px-4 py-3"
                >
                  <input
                    type="radio" name="plusOneMealOptionId" value={meal.id}
                    defaultChecked={plusOne?.mealOptionId === meal.id}
                  />
                  <span>{meal.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <label className="block">
          <span className="text-sm text-stone-500">Аллергии и ограничения в еде</span>
          <input
            name="allergies" maxLength={500} defaultValue={guest.allergies ?? ""}
            className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="text-sm text-stone-500">Что-то ещё для организатора</span>
          <textarea
            name="comment" maxLength={500} rows={3} defaultValue={guest.comment ?? ""}
            className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"
          />
        </label>

        <button className="w-full rounded-full bg-stone-900 px-8 py-4 text-white">
          {answered ? "Сохранить ответ" : "Отправить"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <a href={`/i/${eventSlug}/${token}`} className="text-sm text-stone-500 underline">
          Вернуться к приглашению
        </a>
      </p>
    </main>
  );
}
