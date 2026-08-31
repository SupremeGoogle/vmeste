/**
 * Сводка ответов и именные ссылки.
 *
 * Экран отвечает на три вопроса, которые организатор задаёт каждый день до
 * свадьбы: сколько придёт, кому ещё не дошла ссылка и что заказывать на кухню.
 * Поэтому счётчик «ссылка не открыта» стоит рядом с «не ответили»: молчание
 * гостя и недоставленная смс — разные проблемы с разными действиями.
 */
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent, setRsvpDeadline } from "@/server/repositories/events";
import { listRsvp, rsvpSummary, setRsvpManually } from "@/server/services/rsvp";
import { formatDeadline } from "@/lib/format-datetime";

export const dynamic = "force-dynamic";

const RSVP_LABEL: Record<string, string> = {
  PENDING: "Ждём",
  ACCEPTED: "Придёт",
  DECLINED: "Не придёт",
};

export default async function RsvpSummaryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  const [summary, guests] = await Promise.all([rsvpSummary(ctx.eventId), listRsvp(ctx.eventId)]);

  async function setStatus(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const status = String(formData.get("status"));
    if (status !== "PENDING" && status !== "ACCEPTED" && status !== "DECLINED") return;
    await setRsvpManually(ctx, String(formData.get("guestId")), status);
    revalidatePath(`/app/e/${eventId}/rsvp`);
  }

  async function saveDeadline(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const raw = String(formData.get("deadline") ?? "").trim();
    // Дата из <input type="date"> приходит без времени: считаем концом дня
    // по поясу площадки, иначе срок «до 1 сентября» истечёт 31 августа в 21:00.
    await setRsvpDeadline(ctx, eventId, raw ? new Date(`${raw}T23:59:59`) : null);
    revalidatePath(`/app/e/${eventId}/rsvp`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Придут", value: summary.accepted },
          { label: "Не придут", value: summary.declined },
          { label: "Ждём ответа", value: summary.pending },
          { label: "Ссылка не открыта", value: summary.notOpened },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="tile-value text-2xl">{tile.value}</p>
            <p className="text-sm text-stone-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4">
        <div className="text-sm text-stone-600">
          <p className="font-medium text-stone-900">На кухню</p>
          <p className="mt-1">
            {summary.meals.map((meal) => `${meal.title}: ${meal.count}`).join(" · ")}
          </p>
          <p className="mt-1 text-stone-500">Из них спутников (+1): {summary.plusOnes}</p>
        </div>

        <form action={saveDeadline} className="flex items-end gap-2">
          <label className="text-sm">
            <span className="block text-xs text-stone-500">Ответить до</span>
            <input
              type="date" name="deadline"
              defaultValue={event.rsvpDeadline?.toISOString().slice(0, 10) ?? ""}
              className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
            Сохранить
          </button>
        </form>

        <a
          href={`/api/app/events/${eventId}/guests/export`}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          Выгрузить CSV
        </a>
      </div>

      {event.rsvpDeadline ? (
        <p className="mt-2 text-xs text-stone-500">
          Форма ответа закроется после {formatDeadline(event.rsvpDeadline, event.timezone)};
          проставить ответ вручную можно будет и позже — здесь, в таблице.
        </p>
      ) : null}

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="py-2 font-normal">Гость</th>
            <th className="py-2 font-normal">Ответ</th>
            <th className="py-2 font-normal">Блюдо</th>
            <th className="py-2 font-normal">Аллергии и комментарий</th>
            <th className="py-2 font-normal">Ссылка</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.id} className="border-b border-stone-100 align-top">
              <td className="py-2">
                {guest.displayName}
                {guest.parentGuest ? (
                  <span className="block text-xs text-stone-400">
                    +1 к {guest.parentGuest.displayName}
                  </span>
                ) : null}
              </td>
              <td className="py-2">
                <form action={setStatus} className="flex items-center gap-1">
                  <input type="hidden" name="guestId" value={guest.id} />
                  <select
                    name="status" defaultValue={guest.rsvpStatus}
                    className="rounded border border-stone-300 px-2 py-1 text-xs"
                  >
                    {Object.entries(RSVP_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button className="text-xs text-stone-500 underline">ок</button>
                </form>
              </td>
              <td className="py-2 text-stone-600">{guest.mealOption?.title ?? "—"}</td>
              <td className="py-2 text-stone-600">
                {guest.allergies ? <span className="block">{guest.allergies}</span> : null}
                {guest.comment ? (
                  <span className="block text-stone-500">{guest.comment}</span>
                ) : null}
                {!guest.allergies && !guest.comment ? "—" : null}
              </td>
              <td className="py-2">
                <a
                  href={`/i/${event.slug}/${guest.linkToken}`}
                  className="text-xs text-stone-500 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  открыть
                </a>
                <span className="block text-xs text-stone-400">
                  {guest.linkOpenedAt ? "открыта" : "не открыта"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {guests.length === 0 ? (
        <p className="mt-8 text-stone-600">Гостей пока нет — добавьте их на вкладке «Гости».</p>
      ) : null}
    </main>
  );
}
