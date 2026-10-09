/**
 * «Гости» → «Ответы анкеты»: что гости ответили (раньше — вкладка «Ответы»).
 *
 * Экран отвечает на три вопроса, которые организатор задаёт каждый день до
 * свадьбы: сколько придёт, кому ещё не дошла ссылка и что заказывать на кухню.
 * Поэтому счётчик «ссылка не открыта» стоит рядом с «не ответили»: молчание
 * гостя и недоставленная смс — разные проблемы с разными действиями.
 */
import { revalidatePath } from "next/cache";
import { requireEventContext } from "@/server/context";
import { listRsvp, rsvpSummary, setRsvpManually } from "@/server/services/rsvp";
import { formatDeadline } from "@/lib/format-datetime";
import { effectiveRsvpQuestions } from "@/server/repositories/rsvp-questions";
import { formatAnswer, parseStoredAnswers, WITH_OPTIONS } from "@/lib/rsvp-form";
import Link from "next/link";
import { Fragment } from "react";
import { getUiLang } from "@/server/i18n";
import { makeT } from "@/lib/i18n";

const RSVP_LABEL: Record<string, [string, string]> = {
  PENDING: ["Ждём", "Pending"],
  ACCEPTED: ["Придёт", "Attending"],
  DECLINED: ["Не придёт", "Declined"],
};

export async function RsvpAnswers({
  eventId,
  event,
}: {
  eventId: string;
  event: { slug: string; rsvpDeadline: Date | null; timezone: string };
}) {
  const ctx = await requireEventContext(eventId);
  const lang = await getUiLang();
  const t = makeT(lang);
  const NONE = t("Не выбрано", "Not chosen");

  const [summary, guests, questions] = await Promise.all([
    rsvpSummary(ctx.eventId),
    listRsvp(ctx.eventId),
    effectiveRsvpQuestions(ctx.eventId),
  ]);

  // «Кто что ест» и «кто что пьёт» — только среди тех, кто придёт: по этим
  // спискам заказывают кухню и бар.
  const attending = guests.filter((guest) => guest.rsvpStatus === "ACCEPTED");
  const groupBy = (pick: (guest: (typeof guests)[number]) => string[]) => {
    const groups = new Map<string, string[]>();
    for (const guest of attending) {
      const keys = pick(guest);
      for (const key of keys.length ? keys : [NONE]) groups.set(key, [...(groups.get(key) ?? []), guest.displayName]);
    }
    return [...groups.entries()].sort((a, b) => (a[0] === NONE ? 1 : b[0] === NONE ? -1 : b[1].length - a[1].length));
  };
  const meals = questions.some((q) => q.type === "MEAL") ? groupBy((guest) => (guest.mealOption ? [guest.mealOption.title] : [])) : [];
  const drinks = questions.some((q) => q.type === "DRINKS") ? groupBy((guest) => guest.drinks.map((row) => row.drink.title)) : [];

  // Вопросы с вариантами — распределение ответов.
  const answersOf = new Map(guests.map((guest) => [guest.id, parseStoredAnswers(guest.rsvpAnswers)]));
  const choiceStats = questions
    .filter((q) => WITH_OPTIONS.has(q.type) || q.type === "RATING")
    .map((q) => {
      const counts = new Map<string, number>((q.type === "RATING" ? ["1", "2", "3", "4", "5"] : q.options).map((option) => [option, 0]));
      let answered = 0;
      for (const guest of guests) {
        const answer = answersOf.get(guest.id)?.find((item) => item.questionId === q.id);
        if (!answer) continue;
        answered += 1;
        for (const value of Array.isArray(answer.value) ? answer.value : [answer.value]) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return { question: q, counts: [...counts.entries()], answered };
    });

  async function setStatus(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const status = String(formData.get("status"));
    if (status !== "PENDING" && status !== "ACCEPTED" && status !== "DECLINED") return;
    await setRsvpManually(ctx, String(formData.get("guestId")), status);
    revalidatePath(`/app/e/${eventId}/guests`);
  }

  const statusForm = (guest: (typeof guests)[number]) => (
    <form action={setStatus} className="flex items-center gap-1.5">
      <input type="hidden" name="guestId" value={guest.id} />
      <select
        name="status" defaultValue={guest.rsvpStatus} aria-label={t(`Ответ: ${guest.displayName}`, `RSVP: ${guest.displayName}`)}
        className="min-h-10 rounded-lg border border-stone-300 bg-card px-2 text-sm"
      >
        {Object.entries(RSVP_LABEL).map(([value, [ru, en]]) => (
          <option key={value} value={value}>{t(ru, en)}</option>
        ))}
      </select>
      <button className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm text-stone-700 hover:bg-stone-50">{t("ок", "OK")}</button>
    </form>
  );

  const answerLines = (guest: (typeof guests)[number]) =>
    (answersOf.get(guest.id) ?? []).map((answer) => (
      <span key={answer.questionId} className="block">
        <span className="text-stone-400">{answer.title}:</span> {formatAnswer(answer)}
      </span>
    ));

  return (
    <section className="mt-6">

      {/*
        Сводки «на кухню» здесь больше нет: «рыбка: 0» ничего не говорит
        тому, кто не помнит названий блюд из приглашения, а еда и напитки
        каждого гостя и так стоят в таблице ниже — по ним же считает
        площадка. Срок ответа задаётся там, где он показывается гостю, —
        в данных свадьбы на вкладке «Приглашение».
      */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          {t(
            `Не открыли ссылку: ${summary.notOpened} · спутников (+1): ${summary.plusOnes}`,
            `Haven’t opened their link: ${summary.notOpened} · +1s: ${summary.plusOnes}`,
          )}
          {event.rsvpDeadline ? (
            lang === "en"
              ? <> · RSVP closes after {formatDeadline(event.rsvpDeadline, event.timezone, lang).replace(/^by /, "")}</>
              : <> · форма ответа закроется после {formatDeadline(event.rsvpDeadline, event.timezone)}</>
          ) : null}
        </p>
        <a
          href={`/api/app/events/${eventId}/guests/export`}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          {t("Выгрузить таблицу", "Export spreadsheet")}
        </a>
      </div>

      {meals.length > 0 || drinks.length > 0 || choiceStats.length > 0 ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg text-stone-900">{t("Анкета", "RSVP form")}</h2>
            <Link href={`/app/e/${eventId}/invite/form`} className="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-900">
              {t("Изменить вопросы анкеты", "Edit RSVP questions")}
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { title: t("Кто что ест", "Who’s eating what"), groups: meals, icon: "🍽" },
              { title: t("Кто что пьёт", "Who’s drinking what"), groups: drinks, icon: "🥂" },
            ].filter((card) => card.groups.some(([title]) => title !== NONE)).map((card) => (
              <div key={card.title} className="rounded-2xl border border-stone-200 bg-card p-4">
                <p className="text-sm font-medium text-stone-800"><span aria-hidden>{card.icon}</span> {card.title} <span className="font-normal text-stone-400">{t("· из тех, кто придёт", "· attending guests only")}</span></p>
                <ul className="mt-3 space-y-1.5">
                  {card.groups.map(([title, names]) => (
                    <li key={title}>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
                          <span className={title === NONE ? "text-stone-400" : "text-stone-800"}>{title}</span>
                          <span className="tabular-nums text-stone-600">{names.length} <span className="text-stone-400 transition-transform group-open:rotate-90 inline-block">›</span></span>
                        </summary>
                        <p className="px-2 pb-1 text-xs leading-relaxed text-stone-500">{names.join(", ")}</p>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {choiceStats.map(({ question, counts, answered }) => {
              const max = Math.max(1, ...counts.map(([, n]) => n));
              return (
                <div key={question.id} className="rounded-2xl border border-stone-200 bg-card p-4">
                  <p className="text-sm font-medium text-stone-800">{question.title}</p>
                  <p className="text-xs text-stone-400">{t(`ответили: ${answered}`, `responses: ${answered}`)}</p>
                  <ul className="mt-3 space-y-2">
                    {counts.map(([option, n]) => (
                      <li key={option} className="text-sm">
                        <div className="flex justify-between gap-3"><span className="text-stone-700">{question.type === "RATING" ? "★".repeat(Number(option)) : option}</span><span className="tabular-nums text-stone-500">{n}</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-stone-900" style={{ width: `${(n / max) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* На телефоне семь колонок не помещаются: таблица уезжала вбок, и
          «Блюдо» слипалось с «Напитками». Там — карточка на гостя. */}
      <ul className="mt-8 space-y-3 sm:hidden">
        {guests.map((guest) => {
          const details = [
            [t("Блюдо", "Meal"), guest.mealOption?.title ?? ""],
            [t("Напитки", "Drinks"), guest.drinks.map((row) => row.drink.title).join(", ")],
            [t("Комментарий", "Comment"), guest.comment ?? ""],
            [t("Музыка", "Music"), guest.musicWish ?? ""],
          ].filter(([, value]) => value);
          const answers = answerLines(guest);
          return (
            <li key={guest.id} className="rounded-2xl border border-stone-200 bg-card px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-base text-stone-900">
                  {guest.displayName}
                  {guest.parentGuest ? (
                    <span className="block text-xs text-stone-400">{t(`+1 к ${guest.parentGuest.displayName}`, `${guest.parentGuest.displayName}’s +1`)}</span>
                  ) : null}
                </p>
                <div className="shrink-0">{statusForm(guest)}</div>
              </div>
              {details.length > 0 ? (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-stone-600">
                  {details.map(([term, value]) => (<Fragment key={term}><dt className="text-stone-400">{term}</dt><dd>{value}</dd></Fragment>))}
                </dl>
              ) : null}
              {answers.length > 0 ? <div className="mt-2 text-stone-600">{answers}</div> : null}
              <p className="mt-1 text-xs text-stone-400">
                <a
                  href={`/i/${event.slug}/${guest.linkToken}`}
                  className="inline-block py-1.5 text-stone-500 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("именная ссылка", "personal link")}
                </a>
                {" · "}{guest.linkOpenedAt ? t("открыта", "opened") : t("не открыта", "not opened")}
              </p>
            </li>
          );
        })}
      </ul>

      <table className="mt-8 hidden w-full border-collapse text-sm sm:table">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500 [&>th]:pr-4">
            <th className="py-2 font-normal">{t("Гость", "Guest")}</th>
            <th className="py-2 font-normal">{t("Ответ", "RSVP")}</th>
            <th className="py-2 font-normal">{t("Блюдо", "Meal")}</th>
            <th className="py-2 font-normal">{t("Напитки", "Drinks")}</th>
            <th className="py-2 font-normal">{t("Анкета", "Form")}</th>
            <th className="py-2 font-normal">{t("Комментарий", "Comment")}</th>
            <th className="py-2 font-normal">{t("Ссылка", "Link")}</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.id} className="border-b border-stone-100 align-top [&>td]:pr-4">
              <td className="py-2">
                {guest.displayName}
                {guest.parentGuest ? (
                  <span className="block text-xs text-stone-400">
                    {t(`+1 к ${guest.parentGuest.displayName}`, `${guest.parentGuest.displayName}’s +1`)}
                  </span>
                ) : null}
              </td>
              <td className="py-2">{statusForm(guest)}</td>
              <td className="py-2 text-stone-600">{guest.mealOption?.title ?? "—"}</td>
              <td className="py-2 text-stone-600">
                {guest.drinks.map((row) => row.drink.title).join(", ") || "—"}
              </td>
              <td className="py-2 text-stone-600">
                {(answersOf.get(guest.id) ?? []).length === 0 ? "—" : answerLines(guest)}
              </td>
              <td className="py-2 text-stone-600">
                {guest.comment ? (
                  <span className="block text-stone-500">{guest.comment}</span>
                ) : null}
                {guest.musicWish ? (
                  <span className="block text-stone-500">{t("Музыка", "Music")}: {guest.musicWish}</span>
                ) : null}
                {!guest.comment && !guest.musicWish ? "—" : null}
              </td>
              <td className="py-2">
                <a
                  href={`/i/${event.slug}/${guest.linkToken}`}
                  className="text-xs text-stone-500 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("открыть", "open")}
                </a>
                <span className="block text-xs text-stone-400">
                  {guest.linkOpenedAt ? t("открыта", "opened") : t("не открыта", "not opened")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {guests.length === 0 ? (
        <p className="mt-8 text-stone-600">{t("Гостей пока нет — добавьте их в списке гостей.", "No guests yet — add them on the guest list.")}</p>
      ) : null}
    </section>
  );
}
