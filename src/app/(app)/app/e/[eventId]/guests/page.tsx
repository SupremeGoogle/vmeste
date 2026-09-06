import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEventContext } from "@/server/context";
import {
  countGuests, createGuest, listGuests, archiveGuest, setPlusOneAllowed,
} from "@/server/repositories/guests";
import { parseGuestCsv } from "@/server/services/csv-import";
import { ROLE_LABEL } from "@/lib/couple-marks";
import { peekImportDraft, saveImportDraft, takeImportDraft } from "@/server/services/import-draft";
import { createGuests } from "@/server/repositories/guests";

export const dynamic = "force-dynamic";

const RSVP: Record<string, string> = {
  PENDING: "Ждём ответа",
  ACCEPTED: "Придёт",
  DECLINED: "Не придёт",
};

type Guest = Awaited<ReturnType<typeof listGuests>>[number];

/** Строка гостя — общая для списка целиком и для группировки по столам,
 *  чтобы действия (архив, +1) не разъезжались между двумя видами. */
function GuestRow({
  guest, eventId, showTable, togglePlusOne, remove,
}: {
  guest: Guest;
  eventId: string;
  showTable?: boolean;
  togglePlusOne: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
}) {
  return (
    <tr className="border-b border-stone-100">
      <td className="py-2">
        <a href={`/app/e/${eventId}/guests/${guest.id}`} className="hover:underline">
          {guest.displayName}
        </a>
        {guest.role !== "GUEST" ? (
          <span className="ml-2 text-xs text-stone-500">{ROLE_LABEL[guest.role]}</span>
        ) : null}
      </td>
      <td className="py-2 text-stone-600">{RSVP[guest.rsvpStatus]}</td>
      {showTable && (
        <td className="py-2 text-stone-600">{guest.seat ? guest.seat.table.label : "—"}</td>
      )}
      <td className="py-2">
        {/* Разрешение на спутника — по гостю, а не общее: «плюс один»
            зовут не всем, и решает это организатор, а не гость. */}
        <form action={togglePlusOne}>
          <input type="hidden" name="guestId" value={guest.id} />
          <input type="hidden" name="allowed" value={guest.plusOneAllowed ? "0" : "1"} />
          <button className="text-xs text-stone-500 underline">
            {guest.plusOneAllowed ? "разрешён" : "разрешить"}
          </button>
        </form>
      </td>
      <td className="py-2 text-right">
        <form action={remove}>
          <input type="hidden" name="guestId" value={guest.id} />
          <button className="text-xs text-stone-400 hover:text-red-700">В архив</button>
        </form>
      </td>
    </tr>
  );
}

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ draft?: string; view?: string }>;
}) {
  const { eventId } = await params;
  const { draft: draftId, view } = await searchParams;
  const groupByTable = view === "bytable";
  const ctx = await requireEventContext(eventId);
  const [guests, counts] = await Promise.all([listGuests(ctx), countGuests(ctx)]);
  const draft = draftId ? peekImportDraft(ctx, draftId) : null;

  /**
   * Группировка по столам — «видно, кто за каким столом сидит», не листая
   * колонку «Стол» построчно. Нерассаженные и президиум идут отдельными
   * группами: первый — потому что это то, за чем организатор следит
   * ближе всего к дате свадьбы, второй — потому что молодожёны не «стол
   * по алфавиту», их ищут первыми.
   */
  const tableGroups = (() => {
    if (!groupByTable) return null;

    const byLabel = new Map<string, typeof guests>();
    const unseated: typeof guests = [];

    for (const guest of guests) {
      if (!guest.seat) {
        unseated.push(guest);
        continue;
      }
      const label = guest.seat.table.label;
      const group = byLabel.get(label);
      if (group) group.push(guest);
      else byLabel.set(label, [guest]);
    }

    const seatedGroups = [...byLabel.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "ru", { numeric: true }))
      .map(([label, members]) => ({
        label,
        guests: members.sort((a, b) => (a.seat!.index) - (b.seat!.index)),
      }));

    return unseated.length > 0
      ? [...seatedGroups, { label: "Не рассажено", guests: unseated }]
      : seatedGroups;
  })();

  async function addGuest(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const displayName = String(formData.get("displayName") ?? "").trim();
    if (displayName.length < 2) return;
    await createGuest(ctx, {
      displayName,
      phone: String(formData.get("phone") ?? "") || null,
      plusOneAllowed: formData.get("plusOneAllowed") === "on",
    });
    revalidatePath(`/app/e/${eventId}/guests`);
  }

  /**
   * Импорт в два шага (PLAN.md §5.9): сначала предпросмотр, потом запись.
   *
   * Одношаговый импорт уже успел показать, чем он плох: файл заливается
   * молча, и если разделитель угадан неверно или колонки перепутаны, в
   * списке гостей оказывается сто строк вида «Иванов;+7999…». Отменять
   * это некому — гостей уже нельзя просто удалить, у них есть ссылки.
   *
   * Разобранный файл кладём в короткоживущий черновик и показываем первые
   * десять строк с кодировкой, разделителем и предупреждениями. Пишем
   * в базу только после «Импортировать».
   */
  async function previewCsv(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return;

    const parsed = parseGuestCsv(await file.arrayBuffer());
    const draftId = await saveImportDraft(ctx, parsed);
    redirect(`/app/e/${eventId}/guests?draft=${draftId}`);
  }

  async function confirmImport(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const draft = takeImportDraft(ctx, String(formData.get("draftId") ?? ""));
    if (draft && draft.rows.length > 0) await createGuests(ctx, draft.rows);
    redirect(`/app/e/${eventId}/guests`);
  }

  async function cancelImport(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    takeImportDraft(ctx, String(formData.get("draftId") ?? ""));
    redirect(`/app/e/${eventId}/guests`);
  }

  async function togglePlusOne(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await setPlusOneAllowed(
      ctx,
      String(formData.get("guestId")),
      formData.get("allowed") === "1",
    );
    revalidatePath(`/app/e/${eventId}/guests`);
  }

  async function remove(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await archiveGuest(ctx, String(formData.get("guestId")));
    revalidatePath(`/app/e/${eventId}/guests`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
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
          <label className="mt-2 flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" name="plusOneAllowed" />
            Может прийти с парой
          </label>
          <button className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
            Добавить
          </button>
        </form>

        <form action={previewCsv} className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-medium">Импорт из CSV</p>
          <p className="mt-1 text-xs text-stone-500">
            Кодировка и разделитель определяются сами — файл из Excel подойдёт.
            Колонка «+1» («да» / «+») разрешит гостю прийти с парой.
          </p>
          <input
            type="file" name="file" accept=".csv,text/csv"
            className="mt-3 w-full text-sm"
          />
          <button className="mt-3 rounded-lg border border-stone-300 px-4 py-2 text-sm">
            Посмотреть, что получится
          </button>
        </form>
      </div>

      {draft ? (
        <section className="mt-6 rounded-xl border border-stone-900 bg-white p-4">
          <p className="font-medium">Предпросмотр импорта</p>
          <p className="mt-1 text-sm text-stone-600">
            Кодировка: {draft.encoding} · разделитель: «{draft.delimiter}» ·
            строк: {draft.rows.length}
            {draft.skipped > 0 ? ` · пропущено пустых: ${draft.skipped}` : ""}
          </p>

          {draft.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {draft.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-1 font-normal">Гость</th>
                <th className="py-1 font-normal">Телефон</th>
                <th className="py-1 font-normal">Заметка</th>
                <th className="py-1 font-normal">+1</th>
              </tr>
            </thead>
            <tbody>
              {draft.rows.slice(0, 10).map((row, index) => (
                <tr key={index} className="border-b border-stone-100">
                  <td className="py-1">{row.displayName}</td>
                  <td className="py-1 text-stone-600">{row.phone ?? "—"}</td>
                  <td className="py-1 text-stone-600">{row.note ?? "—"}</td>
                  <td className="py-1 text-stone-600">{row.plusOneAllowed ? "да" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {draft.rows.length > 10 ? (
            <p className="mt-2 text-xs text-stone-500">
              …и ещё {draft.rows.length - 10}. Показаны первые десять — если они
              выглядят правильно, остальные разобраны так же.
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <form action={confirmImport}>
              <input type="hidden" name="draftId" value={draftId} />
              <button className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white">
                Импортировать {draft.rows.length}
              </button>
            </form>
            <form action={cancelImport}>
              <input type="hidden" name="draftId" value={draftId} />
              <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                Отмена
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1 text-sm">
          <a
            href={`/app/e/${eventId}/guests`}
            className={`rounded-md px-3 py-1 ${
              !groupByTable ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            Списком
          </a>
          <a
            href={`/app/e/${eventId}/guests?view=bytable`}
            className={`rounded-md px-3 py-1 ${
              groupByTable ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            По столам
          </a>
        </div>
        {groupByTable && (
          <p className="text-xs text-stone-500">
            Группы отсортированы по номеру стола, внутри — по месту за столом.
          </p>
        )}
      </div>

      {groupByTable ? (
        <div className="mt-4 space-y-6">
          {tableGroups!.map((group) => (
            <section key={group.label}>
              <h3 className="text-sm font-medium text-stone-900">
                {group.label} <span className="font-normal text-stone-500">— {group.guests.length}</span>
              </h3>
              <table className="mt-2 w-full border-collapse text-sm">
                <tbody>
                  {group.guests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      eventId={eventId}
                      togglePlusOne={togglePlusOne}
                      remove={remove}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="py-2 font-normal">Гость</th>
              <th className="py-2 font-normal">Ответ</th>
              <th className="py-2 font-normal">Стол</th>
              <th className="py-2 font-normal">+1</th>
              <th className="py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                eventId={eventId}
                showTable
                togglePlusOne={togglePlusOne}
                remove={remove}
              />
            ))}
          </tbody>
        </table>
      )}

      {guests.length === 0 && (
        <p className="mt-8 text-stone-600">Гостей пока нет — добавьте вручную или загрузите CSV.</p>
      )}
    </main>
  );
}
