/**
 * Карточка гостя.
 *
 * Здесь живёт всё, что про одного человека и не помещается в строку
 * списка: варианты написания имени, именная ссылка, спутник, место,
 * фотографии. Отдельная страница нужна ровно из-за алиасов — «мама Лена»
 * и девичья фамилия добавляются поштучно и в спокойный момент, а не
 * в общем списке на сто строк.
 */
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import {
  addAlias, archiveGuest, getGuest, removeAlias, reissueLinkToken,
  setGuestRole, setPlusOneAllowed, updateGuest,
} from "@/server/repositories/guests";
import { ROLE_LABEL } from "@/lib/couple-marks";
import type { GuestRole } from "@/generated/prisma/enums";
import { listGuestWishes } from "@/server/services/wishes";
import { listGuestPhotos } from "@/server/services/photos";

export const dynamic = "force-dynamic";

const RSVP: Record<string, string> = {
  PENDING: "ждём ответа",
  ACCEPTED: "придёт",
  DECLINED: "не придёт",
};

type Props = {
  params: Promise<{ eventId: string; guestId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function GuestCardPage({ params, searchParams }: Props) {
  const { eventId, guestId } = await params;
  const { error } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const [event, guest] = await Promise.all([getEvent(ctx, eventId), getGuest(ctx, guestId)]);
  if (!event || !guest) notFound();

  const [photos, wishes] = await Promise.all([
    listGuestPhotos({ orgId: ctx.orgId, eventId: ctx.eventId, guestId: guest.id }),
    listGuestWishes({ eventId: ctx.eventId, guestId: guest.id }),
  ]);

  async function save(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await updateGuest(ctx, guestId, {
      displayName: String(formData.get("displayName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
    });
    revalidatePath(`/app/e/${eventId}/guests/${guestId}`);
  }

  async function addAliasAction(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const created = await addAlias(ctx, guestId, String(formData.get("alias") ?? ""));
    if (!created) {
      redirect(
        `/app/e/${eventId}/guests/${guestId}?error=` +
          encodeURIComponent("Слишком короткий вариант имени или он уже есть"),
      );
    }
    revalidatePath(`/app/e/${eventId}/guests/${guestId}`);
  }

  async function dropAlias(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await removeAlias(ctx, guestId, String(formData.get("aliasId")));
    revalidatePath(`/app/e/${eventId}/guests/${guestId}`);
  }

  async function togglePlusOne(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await setPlusOneAllowed(ctx, guestId, formData.get("allowed") === "1");
    revalidatePath(`/app/e/${eventId}/guests/${guestId}`);
  }

  /** Кто это на свадьбе. Роль видна на плане зала: место молодожёнов
   *  помечается значком — «а где сидят молодые» спрашивают все. */
  async function changeRole(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const role = String(formData.get("role") ?? "GUEST") as GuestRole;
    if (!["GUEST", "BRIDE", "GROOM"].includes(role)) return;
    await setGuestRole(ctx, guestId, role);
    revalidatePath(`/app/e/${eventId}/guests/${guestId}`);
  }

  async function reissue() {
    "use server";
    const ctx = await requireEventContext(eventId);
    await reissueLinkToken(ctx, guestId);
    revalidatePath(`/app/e/${eventId}/guests/${guestId}`);
  }

  async function toArchive() {
    "use server";
    const ctx = await requireEventContext(eventId);
    await archiveGuest(ctx, guestId);
    redirect(`/app/e/${eventId}/guests`);
  }

  const manual = guest.aliases.filter((alias) => alias.source === "manual");
  const auto = guest.aliases.filter((alias) => alias.source !== "manual");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href={`/app/e/${eventId}/guests`} className="text-sm text-stone-500 underline">
        ← ко всем гостям
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">{guest.displayName}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {RSVP[guest.rsvpStatus]}
        {guest.mealOption ? ` · ${guest.mealOption.title}` : ""}
        {guest.seat ? ` · ${guest.seat.table.label}, место ${guest.seat.index + 1}` : " · без места"}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <form action={save} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="block">
          <span className="text-xs text-stone-500">Имя в списке</span>
          <input
            name="displayName" defaultValue={guest.displayName}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-stone-400">
            При исправлении имени варианты для поиска пересобираются заново,
            а добавленные вручную остаются.
          </span>
        </label>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="text-xs text-stone-500">Телефон</span>
            <input
              name="phone" defaultValue={guest.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-stone-500">Почта</span>
            <input
              name="email" defaultValue={guest.email ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-stone-500">Заметка</span>
          <input
            name="note" defaultValue={guest.note ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Сохранить</button>
      </form>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium">Кто это на свадьбе</h2>
        <form action={changeRole} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <select
            name="role" defaultValue={guest.role}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            {(["GUEST", "BRIDE", "GROOM"] as GuestRole[]).map((role) => (
              <option key={role} value={role}>{ROLE_LABEL[role]}</option>
            ))}
          </select>
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
            Сохранить
          </button>
          <span className="text-xs text-stone-400">
            Невеста и жених отмечаются значком на плане зала — и в панели,
            и у гостя, и в распечатке.
          </span>
        </form>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium">Как его могут искать на входе</h2>
        <p className="mt-1 text-xs text-stone-500">
          Поиск и так знает уменьшительные имена. Сюда добавляют то, чего он
          знать не может: девичью фамилию, «мама Лена», прозвище.
        </p>

        {manual.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {manual.map((alias) => (
              <li key={alias.id}>
                <form action={dropAlias} className="flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1 text-sm">
                  <input type="hidden" name="aliasId" value={alias.id} />
                  <span>{alias.alias}</span>
                  <button className="text-stone-400 hover:text-red-700" aria-label="Убрать">×</button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}

        <form action={addAliasAction} className="mt-3 flex gap-2">
          <input
            name="alias" placeholder="Например, «мама Лена»"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Добавить</button>
        </form>

        {auto.length > 0 ? (
          <p className="mt-3 text-xs text-stone-400">
            Само знает: {auto.map((alias) => alias.alias).join(", ")}
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <h2 className="font-medium">Именная ссылка</h2>
        <p className="mt-2 font-mono text-xs break-all text-stone-600">
          /i/{event.slug}/{guest.linkToken}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {guest.linkOpenedAt
            ? `Открыта ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(guest.linkOpenedAt)}`
            : "Ещё не открывали"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={`/i/${event.slug}/${guest.linkToken}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            открыть как гость
          </a>
          <form action={reissue}>
            <button className="text-xs text-stone-500 underline">перевыпустить</button>
          </form>
          <span className="text-xs text-stone-400">
            Перевыпуск гасит старую ссылку — если она ушла не тому человеку.
          </span>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <h2 className="font-medium">Спутник</h2>
        <p className="mt-2 text-stone-600">
          {guest.plusOneAllowed ? "Может прийти с парой" : "Приглашён один"}
          {guest.plusOneName ? ` · назвал: ${guest.plusOneName}` : ""}
        </p>
        <form action={togglePlusOne} className="mt-2">
          <input type="hidden" name="allowed" value={guest.plusOneAllowed ? "0" : "1"} />
          <button className="text-xs text-stone-500 underline">
            {guest.plusOneAllowed ? "запретить пару" : "разрешить пару"}
          </button>
        </form>
      </section>

      {photos.length > 0 || wishes.length > 0 ? (
        <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <h2 className="font-medium">Что прислал</h2>
          <p className="mt-2 text-stone-600">
            Фотографий: {photos.length} · пожеланий: {wishes.length}
          </p>
        </section>
      ) : null}

      <form action={toArchive} className="mt-6">
        <button className="text-sm text-stone-400 hover:text-red-700">
          Убрать гостя в архив
        </button>
        <span className="ml-3 text-xs text-stone-400">
          Место за столом освободится, ответы и фотографии останутся.
        </span>
      </form>
    </main>
  );
}
