/**
 * Розыгрыш.
 *
 * Экран для ведущего: зафиксировать участников, запустить, показать
 * победителя. Всё формами — потому что нажимают их один раз за вечер,
 * зато при полном зале и с чужого планшета.
 *
 * Seed показывается открыто. Это не отладочная информация, а способ
 * ответить на вопрос «а как выбрали»: с тем же seed и тем же списком
 * победитель получается тот же, и это можно проверить при всех.
 */
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import {
  createRaffle, drawWinner, eligibleGuests, fixEntries, getRaffle, listRaffles, resetDraw,
} from "@/server/services/raffle";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; raffle?: string }>;
};

export default async function RafflePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { error, raffle: selectedId } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  const raffles = await listRaffles(ctx);
  const current = selectedId
    ? await getRaffle(ctx, selectedId)
    : raffles[0]
      ? await getRaffle(ctx, raffles[0].id)
      : null;
  const eligible = await eligibleGuests(ctx.eventId);

  async function add(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const created = await createRaffle(ctx, String(formData.get("title") ?? ""));
    revalidatePath(`/app/e/${eventId}/raffle`);
    return void created;
  }

  async function fix(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const result = await fixEntries(ctx, String(formData.get("raffleId")));
    if (!result.ok) {
      revalidatePath(`/app/e/${eventId}/raffle`);
      return;
    }
    revalidatePath(`/app/e/${eventId}/raffle`);
  }

  async function draw(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const result = await drawWinner(
      ctx,
      String(formData.get("raffleId")),
      String(formData.get("seed") ?? "") || undefined,
    );
    void result;
    revalidatePath(`/app/e/${eventId}/raffle`);
  }

  async function reset(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await resetDraw(ctx, String(formData.get("raffleId")));
    revalidatePath(`/app/e/${eventId}/raffle`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">
          В розыгрыш попадают гости, у которых есть хотя бы одна одобренная
          фотография. Сейчас таких: <b className="text-stone-900">{eligible.length}</b>.
        </p>
      </div>

      {current ? (
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">{current.title}</h2>
            <span className="text-sm text-stone-500">
              участников зафиксировано: {current.entries.length}
            </span>
          </div>

          {current.winnerLabel ? (
            <div className="mt-4 rounded-lg bg-stone-900 px-5 py-6 text-center text-white">
              <p className="text-sm text-white/60">Победитель</p>
              <p className="mt-1 text-3xl font-semibold">{current.winnerLabel}</p>
              <p className="mt-3 font-mono text-xs text-white/50">seed: {current.seed}</p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {!current.drawnAt ? (
              <>
                <form action={fix}>
                  <input type="hidden" name="raffleId" value={current.id} />
                  <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                    Зафиксировать участников
                  </button>
                </form>
                <form action={draw} className="flex gap-2">
                  <input type="hidden" name="raffleId" value={current.id} />
                  <input
                    name="seed" placeholder="seed (необязательно)"
                    defaultValue={current.seed ?? ""}
                    className="rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
                  />
                  <button
                    disabled={current.entries.length === 0}
                    className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white disabled:opacity-40"
                  >
                    Разыграть
                  </button>
                </form>
              </>
            ) : (
              <form action={reset}>
                <input type="hidden" name="raffleId" value={current.id} />
                <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                  Отменить результат
                </button>
                <span className="ml-3 text-xs text-stone-500">
                  Seed сохраняется: повторный запуск даст того же победителя.
                </span>
              </form>
            )}
          </div>

          {current.entries.length > 0 ? (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-stone-500">
                Список участников ({current.entries.length})
              </summary>
              <ul className="mt-2 columns-2 text-stone-600 sm:columns-3">
                {current.entries.map((entry) => (
                  <li key={entry.guestId}>{entry.label}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      {raffles.length > 1 ? (
        <ul className="mt-6 flex flex-wrap gap-2 text-sm">
          {raffles.map((item) => (
            <li key={item.id}>
              <a
                href={`/app/e/${eventId}/raffle?raffle=${item.id}`}
                className={`rounded-full border px-3 py-1 ${
                  current?.id === item.id ? "border-stone-900" : "border-stone-300"
                }`}
              >
                {item.title}
                {item.winnerLabel ? ` — ${item.winnerLabel}` : ""}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={add} className="mt-8 flex flex-wrap gap-2">
        <input
          name="title" placeholder="Название розыгрыша"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
          Добавить розыгрыш
        </button>
      </form>

      <p className="mt-6 text-xs text-stone-500">
        Чтобы зал увидел розыгрыш, переключите экран в режим «Розыгрыш»
        на вкладке «Экран».
      </p>
    </main>
  );
}
