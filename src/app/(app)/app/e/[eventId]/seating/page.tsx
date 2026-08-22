/**
 * Страница рассадки.
 *
 * Два слоя намеренно: сверху конструктор с перетаскиванием, снизу те же
 * действия обычными формами. Формы не рудимент — это запасной путь, если
 * в день свадьбы на планшете координатора не выполнится JS. Обе ветки
 * ходят через один и тот же applyOp.
 */
import { revalidatePath, updateTag } from "next/cache";
import { requireEventContext } from "@/server/context";
import { seatingTag } from "@/lib/cache-tags";
import { SHAPES, SHAPE_LABEL } from "@/lib/seating-geometry";
import type { TableShape } from "@/generated/prisma/enums";
import { listTables, listUnseatedGuests } from "@/server/repositories/seating";
import { getEvent } from "@/server/repositories/events";
import { applyOp } from "@/server/services/seating-ops";
import { SeatingEditor } from "@/components/seating/editor";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SeatingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [event, tables, unseated] = await Promise.all([
    getEvent(ctx, eventId),
    listTables(ctx),
    listUnseatedGuests(ctx),
  ]);
  if (!event) notFound();

  async function addTable(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const label = String(formData.get("label") ?? "").trim();
    const capacity = Number(formData.get("capacity") ?? 8);
    const shape = String(formData.get("shape") ?? "ROUND") as TableShape;
    if (!label) return;
    // Версия не передаётся: форма её не знает, а добавление стола
    // ничего не перетирает.
    await applyOp(
      ctx,
      {
        kind: "createTable",
        label,
        capacity,
        shape: SHAPES.includes(shape) ? shape : "ROUND",
      },
      null,
    );
    updateTag(seatingTag(eventId));
    revalidatePath(`/app/e/${eventId}/seating`);
  }

  async function removeTable(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await applyOp(ctx, { kind: "deleteTable", tableId: String(formData.get("tableId")) }, null);
    updateTag(seatingTag(eventId));
    revalidatePath(`/app/e/${eventId}/seating`);
  }

  /** Форму стола меняют уже после того, как он поставлен: круглый стол
   *  оказался президиумом, президиум — прямоугольным. */
  async function changeShape(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const shape = String(formData.get("shape") ?? "") as TableShape;
    if (!SHAPES.includes(shape)) return;
    await applyOp(
      ctx,
      { kind: "setShape", tableId: String(formData.get("tableId")), shape },
      null,
    );
    updateTag(seatingTag(eventId));
    revalidatePath(`/app/e/${eventId}/seating`);
  }

  async function assign(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const guestId = String(formData.get("guestId") ?? "");
    if (!guestId) return;
    await applyOp(
      ctx,
      { kind: "assign", seatId: String(formData.get("seatId")), guestId },
      null,
    );
    updateTag(seatingTag(eventId));
    revalidatePath(`/app/e/${eventId}/seating`);
  }

  async function unseat(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await applyOp(ctx, { kind: "clear", seatId: String(formData.get("seatId")) }, null);
    updateTag(seatingTag(eventId));
    revalidatePath(`/app/e/${eventId}/seating`);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <SeatingEditor
        eventId={eventId}
        initialTables={tables}
        initialUnseated={unseated}
        initialVersion={event.seatingVersion}
      />

      <div className="mt-10 flex flex-wrap items-end gap-6 border-t border-stone-200 pt-6">
        <form action={addTable} className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-stone-500">Новый стол</label>
            <input
              name="label" required placeholder="Стол 6"
              className="mt-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500">Форма</label>
            <select
              name="shape" defaultValue="ROUND"
              className="mt-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            >
              {SHAPES.map((shape) => (
                <option key={shape} value={shape}>{SHAPE_LABEL[shape]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500">Мест</label>
            <input
              name="capacity" type="number" min={1} max={20} defaultValue={8}
              className="mt-1 w-20 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button className="rounded-lg bg-stone-900 px-4 py-1.5 text-sm text-white">Добавить</button>
        </form>

        <a
          href={`/api/app/events/${eventId}/seating/pdf`}
          className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm"
        >
          Скачать PDF
        </a>
      </div>

      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-stone-600">
          Списком (работает без перетаскивания)
        </summary>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {tables.map((table) => (
            <div key={table.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{table.label}</p>
                <form action={changeShape} className="ml-auto">
                  <input type="hidden" name="tableId" value={table.id} />
                  <select
                    name="shape" defaultValue={table.shape}
                    className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-600"
                  >
                    {SHAPES.map((shape) => (
                      <option key={shape} value={shape}>{SHAPE_LABEL[shape]}</option>
                    ))}
                  </select>
                  <button className="ml-1 text-xs text-stone-500 hover:text-stone-900">
                    сменить
                  </button>
                </form>
                <form action={removeTable}>
                  <input type="hidden" name="tableId" value={table.id} />
                  <button className="text-xs text-stone-400 hover:text-red-700">Удалить стол</button>
                </form>
              </div>

              <ul className="mt-3 space-y-1.5">
                {table.seats.map((seat) => (
                  <li key={seat.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-stone-400">{seat.index + 1}</span>
                    {seat.guest ? (
                      <>
                        <span className="flex-1">{seat.guest.displayName}</span>
                        <form action={unseat}>
                          <input type="hidden" name="seatId" value={seat.id} />
                          <button className="text-xs text-stone-400 hover:text-stone-900">снять</button>
                        </form>
                      </>
                    ) : (
                      <form action={assign} className="flex flex-1 gap-2">
                        <input type="hidden" name="seatId" value={seat.id} />
                        <select
                          name="guestId"
                          defaultValue=""
                          className="flex-1 rounded border border-stone-200 px-2 py-1 text-sm text-stone-600"
                        >
                          <option value="">— свободно —</option>
                          {unseated.map((guest) => (
                            <option key={guest.id} value={guest.id}>{guest.displayName}</option>
                          ))}
                        </select>
                        <button className="text-xs text-stone-500 hover:text-stone-900">посадить</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {tables.length === 0 && (
        <p className="mt-8 text-stone-600">Столов пока нет — добавьте первый.</p>
      )}
    </main>
  );
}
