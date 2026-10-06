/**
 * Страница рассадки.
 *
 * Редактор с планом и список под ним — один клиентский компонент на
 * общем состоянии. Серверные действия ниже — запасной путь для списка,
 * если в день свадьбы на планшете координатора не выполнится JS: формы
 * списка отправляются сюда. С JS те же действия уходят через редактор.
 * Обе ветки ходят через один и тот же applyOp.
 */
import { revalidatePath, updateTag } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { seatingTag } from "@/lib/cache-tags";
import { SHAPES } from "@/lib/seating-geometry";
import type { TableShape } from "@/generated/prisma/enums";
import { getEditorPlan, listUnseatedGuests } from "@/server/repositories/seating";
import { applyOp, type SeatingOp } from "@/server/services/seating-ops";
import { SeatingEditor } from "@/components/seating/editor";

export const dynamic = "force-dynamic";

const fold = (text: string) => text.toLowerCase().replace(/ё/g, "е").trim();

export default async function SeatingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const plan = await getEditorPlan(ctx);
  if (!plan) notFound();

  /** Действие формы без JS: версию форма не знает, проверка версии пропускается. */
  async function run(op: SeatingOp) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await applyOp(ctx, op, null);
    updateTag(seatingTag(eventId));
    revalidatePath(`/app/e/${eventId}/seating`);
  }

  async function addTable(formData: FormData) {
    "use server";
    const label = String(formData.get("label") ?? "").trim();
    const capacity = Number(formData.get("capacity") ?? 8);
    const shape = String(formData.get("shape") ?? "ROUND") as TableShape;
    if (!label) return;
    await run({
      kind: "createTable",
      label,
      capacity,
      shape: SHAPES.includes(shape) ? shape : "ROUND",
    });
  }

  async function addCoupleTable() {
    "use server";
    await run({ kind: "createCoupleTable", capacity: 2 });
  }

  async function removeTable(formData: FormData) {
    "use server";
    await run({ kind: "deleteTable", tableId: String(formData.get("tableId")) });
  }

  async function changeShape(formData: FormData) {
    "use server";
    const shape = String(formData.get("shape") ?? "") as TableShape;
    if (!SHAPES.includes(shape)) return;
    await run({ kind: "setShape", tableId: String(formData.get("tableId")), shape });
  }

  /** Посадить по имени: есть такой нерассаженный гость — его, нет — завести нового. */
  async function seatByName(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const seatId = String(formData.get("seatId") ?? "");
    const name = String(formData.get("guestName") ?? "").trim();
    if (!seatId || !name) return;

    const unseated = await listUnseatedGuests(ctx);
    const existing = unseated.find(
      (guest) => fold(guest.displayName.replace(/ \((не придёт|не ответил)\)$/, "")) === fold(name),
    );
    await run(
      existing
        ? { kind: "assign", seatId, guestId: existing.id }
        : { kind: "createGuest", displayName: name, seatId },
    );
  }

  async function unseat(formData: FormData) {
    "use server";
    await run({ kind: "clear", seatId: String(formData.get("seatId")) });
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
      <SeatingEditor
        eventId={eventId}
        initial={plan}
        actions={{ addTable, addCoupleTable, removeTable, changeShape, seatByName, unseat }}
      />
    </main>
  );
}
