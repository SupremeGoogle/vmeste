/**
 * План дня для команды — ведущего, диджея, координатора — по ссылке без
 * входа в панель. Ссылку организатор может отключить в «Тайминге».
 *
 * Здесь же список песен, которые гости вписали в анкету, — для диджея.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { listDaySteps, runDayStep, teamPlanAccess } from "@/server/services/day-plan";
import { djPlaylist } from "@/server/services/playlist";
import { DayPlanList } from "@/components/timing/day-plan-list";
import { DayPlanReminders } from "@/components/timing/day-plan-reminders";
import { currentPlanTime } from "@/lib/wedding-day";
import { plural } from "@/lib/plural";
import { makeT, parseLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "План дня · Day plan", referrer: "no-referrer" };

/** Сколько песен показать на странице; полный список — в файле. */
const SHOWN_SONGS = 100;

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function TeamPlanPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { message } = await searchParams;
  const ctx = await teamPlanAccess(token);
  if (!ctx) notFound();

  const [event, steps, songs, now] = await Promise.all([
    db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { title: true, timezone: true, language: true } }),
    listDaySteps(ctx),
    djPlaylist(ctx.eventId, ctx.orgId),
    currentPlanTime(),
  ]);
  if (!event) notFound();
  // Команда работает на языке мероприятия: ведущий английской свадьбы
  // видит план и песни по-английски.
  const lang: Lang = parseLang(event.language) ?? "ru";
  const t = makeT(lang);

  async function run(data: FormData) {
    "use server";
    const ctx = await teamPlanAccess(token);
    if (!ctx) notFound();
    const result = await runDayStep(ctx, String(data.get("stepId") ?? ""), lang);
    revalidatePath(`/team/${token}`);
    revalidatePath(`/app/e/${ctx.eventId}/timing`);
    revalidatePath(`/app/e/${ctx.eventId}/raffle`);
    revalidatePath(`/app/e/${ctx.eventId}/screen`);
    redirect(`/team/${token}?message=${encodeURIComponent(result.message)}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 text-stone-900 sm:px-6">
      <header>
        <p className="text-sm text-stone-500">{t("План дня для команды", "Day plan for the team")}</p>
        <h1 className="mt-1 font-serif text-[34px] leading-tight">{event.title}</h1>
      </header>

      {message ? (
        <p role="status" className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p>
      ) : null}

      {steps.length > 0 ? (
        <div className="mt-6">
          <DayPlanReminders
            eventId={ctx.eventId}
            initialNow={now}
            calendarHref={`/team/${token}/calendar`}
            steps={steps.map((step) => ({ ...step, startsAt: step.startsAt.toISOString() }))}
            lang={lang}
          />
        </div>
      ) : null}

      <DayPlanList steps={steps} timezone={event.timezone} now={now} run={run} lang={lang} />

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">
            {t("Песни от гостей", "Song requests")}{songs.length > 0 ? ` · ${songs.length}` : ""}
          </h2>
          {songs.length > 0 ? (
            <a href={`/team/${token}/playlist`} className="text-sm text-stone-700 underline underline-offset-2">{t("Скачать списком", "Download as a list")}</a>
          ) : null}
        </div>

        {songs.length > 0 ? (
          <ol className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-card">
            {songs.slice(0, SHOWN_SONGS).map((song, index) => (
              <li key={index} className="px-4 py-3 text-sm">
                <p className="text-stone-900">
                  {song.link ? (
                    <a href={song.link} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">{song.song}</a>
                  ) : (
                    song.song
                  )}
                </p>
                <p className="mt-0.5 text-stone-500">
                  {[song.who, song.note].filter(Boolean).join(" — ") || t("без подписи", "unsigned")}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-stone-600">{t("Гости пока не предлагали песен.", "No song requests from guests yet.")}</p>
        )}
        {songs.length > SHOWN_SONGS ? (
          <p className="mt-2 text-xs text-stone-500">
            {t(`Показаны первые ${SHOWN_SONGS} ${plural(SHOWN_SONGS, "песня", "песни", "песен")} — остальные в файле.`, `Showing the first ${SHOWN_SONGS} songs — the rest are in the file.`)}
          </p>
        ) : null}
      </section>
    </main>
  );
}
