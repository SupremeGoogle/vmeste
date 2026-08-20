import { revalidatePath } from "next/cache";
import { requireEventContext } from "@/server/context";
import { countGuests, createGuest, listGuests, archiveGuest } from "@/server/repositories/guests";
import { parseGuestCsv } from "@/server/services/csv-import";
import { createGuests } from "@/server/repositories/guests";

export const dynamic = "force-dynamic";

const RSVP: Record<string, string> = {
  PENDING: "Ждём ответа",
  ACCEPTED: "Придёт",
  DECLINED: "Не придёт",
};

export default async function GuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [guests, counts] = await Promise.all([listGuests(ctx), countGuests(ctx)]);

  async function addGuest(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const displayName = String(formData.get("displayName") ?? "").trim();
    if (displayName.length < 2) return;
    await createGuest(ctx, { displayName, phone: String(formData.get("phone") ?? "") || null });
    revalidatePath(`/app/e/${eventId}/guests`);
  }

  async function importCsv(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return;

    const parsed = parseGuestCsv(await file.arrayBuffer());
    if (parsed.rows.length > 0) await createGuests(ctx, parsed.rows);
    revalidatePath(`/app/e/${eventId}/guests`);
  }

  async function remove(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await archiveGuest(ctx, String(formData.get("guestId")));
    revalidatePath(`/app/e/${eventId}/guests`);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap gap-6 text-sm text-stone-600">
        <span>Всего: <b className="text-stone-900">{counts.total}</b></span>
        <span>Придут: <b className="text-stone-900">{counts.accepted}</b></span>
        <span>Не придут: <b className="text-stone-900">{counts.declined}</b></span>
        <span>Рассажено: <b className="text-stone-900">{counts.seated}</b></span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <form action={addGuest} className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-medium">Добавить гостя</p>
          <input
            name="displayName" required minLength={2} placeholder="Имя и фамилия"
            className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            name="phone" placeholder="Телефон (необязательно)"
            className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
            Добавить
          </button>
        </form>

        <form action={importCsv} className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-medium">Импорт из CSV</p>
          <p className="mt-1 text-xs text-stone-500">
            Кодировка и разделитель определяются сами — файл из Excel подойдёт.
          </p>
          <input
            type="file" name="file" accept=".csv,text/csv"
            className="mt-3 w-full text-sm"
          />
          <button className="mt-3 rounded-lg border border-stone-300 px-4 py-2 text-sm">
            Загрузить
          </button>
        </form>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="py-2 font-normal">Гость</th>
            <th className="py-2 font-normal">Ответ</th>
            <th className="py-2 font-normal">Стол</th>
            <th className="py-2 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.id} className="border-b border-stone-100">
              <td className="py-2">{guest.displayName}</td>
              <td className="py-2 text-stone-600">{RSVP[guest.rsvpStatus]}</td>
              <td className="py-2 text-stone-600">
                {guest.seat ? guest.seat.table.label : "—"}
              </td>
              <td className="py-2 text-right">
                <form action={remove}>
                  <input type="hidden" name="guestId" value={guest.id} />
                  <button className="text-xs text-stone-400 hover:text-red-700">В архив</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {guests.length === 0 && (
        <p className="mt-8 text-stone-600">Гостей пока нет — добавьте вручную или загрузите CSV.</p>
      )}
    </main>
  );
}
