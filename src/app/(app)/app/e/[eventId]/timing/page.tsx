/**
 * Тайминг дня — обычный планер: что, когда, кто отвечает и заметки.
 *
 * Напоминания и действия по кнопке сняты с формы: этап сохраняется без
 * напоминания и без действия, а кнопка у этапа просто отмечает его
 * выполненным. Ведущему и диджею не нужен вход в панель: у команды своя
 * ссылка, по которой виден только план и список песен.
 */
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { changeTeamLink, listDaySteps, runDayStep, saveDayStep } from "@/server/services/day-plan";
import { djPlaylist } from "@/server/services/playlist";
import { currentPlanTime, localDateTime } from "@/lib/wedding-day";
import { plural } from "@/lib/plural";
import { DayPlanList } from "@/components/timing/day-plan-list";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmButton } from "@/components/invite/confirm-button";
import { CopyFormLink } from "@/components/forms/copy-form-link";
import { TimingTemplates } from "@/components/timing/timing-templates";
import { applyTimingTemplate } from "@/server/services/timing-templates";
import "@/components/timing/timing.css";
import type { DayStep } from "@/generated/prisma/client";
import { getUiLang } from "@/server/i18n";
import { countWord, makeT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const INPUT = "mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2 text-sm";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function TimingPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { message } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const lang = await getUiLang();
  const t = makeT(lang);
  const eventLang = event.language === "en" ? "en" : "ru";

  const [steps, songs, now] = await Promise.all([
    listDaySteps(ctx),
    djPlaylist(ctx.eventId, ctx.orgId),
    currentPlanTime(),
  ]);
  const path = `/app/e/${eventId}/timing`;
  const teamPath = event.teamPlanToken ? `/team/${event.teamPlanToken}` : null;

  async function done(message: string) {
    "use server";
    revalidatePath(path);
    if (teamPath) revalidatePath(teamPath);
    redirect(`${path}?message=${encodeURIComponent(message)}`);
  }

  async function save(data: FormData) {
    "use server";
    const result = await saveDayStep(await requireEventContext(eventId), String(data.get("id") ?? ""), {
      title: String(data.get("title") ?? ""),
      responsible: String(data.get("responsible") ?? ""),
      notes: String(data.get("notes") ?? ""),
      localTime: String(data.get("localTime") ?? ""),
      // Планер без напоминаний и действий по кнопке.
      reminderMinutes: "0",
      action: "NONE",
      raffleId: "",
    }, await getUiLang());
    await done(result.message);
  }

  async function run(data: FormData) {
    "use server";
    const result = await runDayStep(await requireEventContext(eventId), String(data.get("stepId") ?? ""), await getUiLang());
    await done(result.message);
  }

  async function applyTemplate(data: FormData) {
    "use server";
    const result = await applyTimingTemplate(await requireEventContext(eventId), String(data.get("templateId") ?? ""), await getUiLang());
    await done(result.message);
  }

  async function remove(data: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const result = await db.dayStep.deleteMany({
      where: { id: String(data.get("id")), eventId, orgId: ctx.orgId, status: { not: "RUNNING" } },
    });
    const t = makeT(await getUiLang());
    await done(result.count ? t("Этап удалён", "Step deleted") : t("Этап сейчас запускается — удалите его чуть позже", "This step is running right now — delete it a bit later"));
  }

  async function link(data: FormData) {
    "use server";
    const revoke = data.get("revoke") === "1";
    await changeTeamLink(await requireEventContext(eventId), revoke);
    const t = makeT(await getUiLang());
    await done(revoke ? t("Старая ссылка команды больше не работает", "The old team link no longer works") : t("Ссылка для команды готова", "The team link is ready"));
  }

  const fields = (step?: DayStep) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={step?.id ?? ""} />
      <label className="block text-sm text-stone-600 sm:col-span-2">
        {t("Что происходит", "What's happening")}
        <input name="title" required maxLength={160} defaultValue={step?.title} placeholder={t("Первый танец", "First dance")} className={INPUT} />
      </label>
      <label className="block text-sm text-stone-600">
        {t("Когда", "When")}
        <input type="datetime-local" name="localTime" required defaultValue={localDateTime(step?.startsAt ?? event.eventDate, event.timezone)} className={INPUT} />
      </label>
      <label className="block text-sm text-stone-600">
        {t("Кто отвечает", "Who's in charge")}
        <input name="responsible" maxLength={120} defaultValue={step?.responsible} placeholder={t("Ведущий", "MC")} className={INPUT} />
      </label>
      <label className="block text-sm text-stone-600 sm:col-span-2">
        {t("Заметки", "Notes")}
        <textarea name="notes" rows={2} maxLength={2000} defaultValue={step?.notes} placeholder={t("Трек, реквизит, кого позвать", "Song, props, who to call up")} className={INPUT} />
      </label>
    </div>
  );

  return (
    <main className="timing-workspace mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {message ? (
        <p role="status" className="mb-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p>
      ) : null}

      <div className="timing-heading flex flex-wrap items-baseline justify-between gap-2">
        <div><h2>{t("План вашего дня", "Your day plan")}</h2><p>{t("От встречи гостей до последнего танца — всё в своём ритме.", "From welcoming guests to the last dance — all at your own pace.")}</p></div>
        {steps.length > 0 ? (
          <span className="text-sm text-stone-500">{t(`выполнено ${steps.filter((step) => step.status === "DONE").length} из ${steps.length}`, `${steps.filter((step) => step.status === "DONE").length} of ${steps.length} done`)}</span>
        ) : null}
      </div>

      <TimingTemplates apply={applyTemplate} hasSteps={steps.length > 0} eventLang={eventLang} />

      <DayPlanList steps={steps} timezone={event.timezone} now={now} run={run} lang={lang}>
        {(step) => (
          <details className="mt-3 border-t border-stone-100 pt-3 text-sm">
            <summary className="cursor-pointer text-stone-500">{t("Изменить", "Edit")}</summary>
            {step.status === "PENDING" ? (
              <form action={save} className="mt-3 space-y-3">
                {fields(step)}
                <SubmitButton className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{t("Сохранить", "Save")}</SubmitButton>
              </form>
            ) : (
              <p className="mt-2 text-stone-500">{t("Этап уже выполнен — изменить его нельзя, только удалить.", "This step is already done — it can't be changed, only deleted.")}</p>
            )}
            <form action={remove} className="mt-3">
              <input type="hidden" name="id" value={step.id} />
              <ConfirmButton
                disabled={step.status === "RUNNING"}
                confirmText={t(`Удалить «${step.title}» из плана?`, `Delete “${step.title}” from the plan?`)}
                className="text-red-700 underline underline-offset-2"
              >
                {t("Удалить этап", "Delete step")}
              </ConfirmButton>
            </form>
          </details>
        )}
      </DayPlanList>

      <details className="timing-add-step">
      <summary>{t("＋ Добавить свой этап", "＋ Add your own step")}</summary>
      <form action={save} className="space-y-3">
        {fields()}
        <SubmitButton className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-50" pendingText={t("Добавляем…", "Adding…")}>
          {t("Добавить этап", "Add step")}
        </SubmitButton>
      </form>
      </details>

      <section className="mt-8 rounded-xl border border-stone-200 bg-card p-5">
        <h2 className="text-lg">{t("Для ведущего и диджея", "For the MC and DJ")}</h2>
        <p className="mt-1 text-sm text-stone-600">
          {t(
            "По этой ссылке видно только план дня и песни гостей. Отмечать этапы по ней можно, менять что-то ещё — нельзя.",
            "This link shows only the day plan and guests' song requests. Steps can be marked done there, but nothing else can be changed.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {teamPath ? (
            <>
              <CopyFormLink path={teamPath} />
              <a href={teamPath} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 px-4 py-2 text-sm">{t("Открыть ↗", "Open ↗")}</a>
              <form action={link}>
                <input type="hidden" name="revoke" value="1" />
                <ConfirmButton confirmText={t("Отключить ссылку? Тот, у кого она есть, больше не откроет план.", "Turn off the link? Anyone who has it won't be able to open the plan anymore.")} className="px-2 py-2 text-sm text-red-700 underline underline-offset-2">
                  {t("Отключить ссылку", "Turn off link")}
                </ConfirmButton>
              </form>
            </>
          ) : (
            <form action={link}>
              <SubmitButton className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{t("Создать ссылку", "Create link")}</SubmitButton>
            </form>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4 text-sm">
          <span className="text-stone-600">
            {songs.length > 0
              ? t(
                `Гости предложили ${songs.length} ${plural(songs.length, "песню", "песни", "песен")}`,
                `Guests suggested ${countWord("en", songs.length, ["песня", "песни", "песен"], ["song", "songs"])}`,
              )
              : t("Песен пока нет — добавьте вопрос о песне в анкету или создайте музыкальную форму.", "No songs yet — add a song question to the RSVP form or create a music form.")}
          </span>
          {songs.length > 0 ? (
            <a href={`/api/app/events/${eventId}/playlist`} className="text-stone-700 underline underline-offset-2">{t("Скачать список для диджея", "Download the list for the DJ")}</a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
