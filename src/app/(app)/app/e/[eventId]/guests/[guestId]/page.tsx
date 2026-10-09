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
import { ROLE_LABEL, ROLE_LABEL_EN } from "@/lib/couple-marks";
import { getT, getUiLang } from "@/server/i18n";
import { localeOf, makeT } from "@/lib/i18n";
import type { GuestRole } from "@/generated/prisma/enums";
import { listGuestWishes } from "@/server/services/wishes";
import { listGuestPhotos } from "@/server/services/photos";

export const dynamic = "force-dynamic";

const RSVP: Record<string, [string, string]> = {
  PENDING: ["ждём ответа", "awaiting reply"],
  ACCEPTED: ["придёт", "attending"],
  DECLINED: ["не придёт", "declined"],
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
  const lang = await getUiLang();
  const t = makeT(lang);

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
      const t = await getT();
      redirect(
        `/app/e/${eventId}/guests/${guestId}?error=` +
          encodeURIComponent(t("Слишком короткий вариант имени или он уже есть", "That name variant is too short or already added")),
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

  /** Кто это на свадьбе. Жених и невеста уходят из списка гостей, но
   *  рассадка сажает их за стол молодожёнов и отмечает значком. */
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
        {t("← ко всем гостям", "← All guests")}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">{guest.displayName}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {t(...RSVP[guest.rsvpStatus])}
        {guest.mealOption ? ` · ${guest.mealOption.title}` : ""}
        {guest.drinks.length > 0
          ? ` · ${[...guest.drinks]
              .sort((a, b) => a.drink.order - b.drink.order)
              .map((row) => row.drink.title)
              .join(", ")}`
          : ""}
        {guest.seat
          ? t(` · ${guest.seat.table.label}, место ${guest.seat.index + 1}`, ` · ${guest.seat.table.label}, seat ${guest.seat.index + 1}`)
          : t(" · без места", " · not seated")}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <form action={save} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-card p-4">
        <label className="block">
          <span className="text-xs text-stone-500">{t("Имя в списке", "Name on the list")}</span>
          <input
            name="displayName" defaultValue={guest.displayName}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-stone-400">
            {t(
              "При исправлении имени варианты для поиска пересобираются заново, а добавленные вручную остаются.",
              "When you edit the name, search variants are rebuilt automatically; ones you added by hand are kept.",
            )}
          </span>
        </label>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="text-xs text-stone-500">{t("Телефон", "Phone")}</span>
            <input
              name="phone" defaultValue={guest.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-stone-500">{t("Почта", "Email")}</span>
            <input
              name="email" defaultValue={guest.email ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-stone-500">{t("Заметка", "Note")}</span>
          <input
            name="note" defaultValue={guest.note ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">{t("Сохранить", "Save")}</button>
      </form>

      <section className="mt-4 rounded-xl border border-stone-200 bg-card p-4">
        <h2 className="text-sm font-medium">{t("Кто это на свадьбе", "Role at the wedding")}</h2>
        <form action={changeRole} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <select
            name="role" defaultValue={guest.role}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            {(["GUEST", "BRIDE", "GROOM"] as GuestRole[]).map((role) => (
              <option key={role} value={role}>{t(ROLE_LABEL[role], ROLE_LABEL_EN[role])}</option>
            ))}
          </select>
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
            {t("Сохранить", "Save")}
          </button>
          <span className="text-xs text-stone-400">
            {t(
              "Невеста и жених уходят из списка гостей и садятся за стол молодожёнов — на плане зала их место отмечено значком.",
              "The bride and groom leave the guest list and sit at the couple’s table — their seats are marked with an icon on the floor plan.",
            )}
          </span>
        </form>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-card p-4">
        <h2 className="text-sm font-medium">{t("Как его могут искать на входе", "How people may search for them at check-in")}</h2>
        <p className="mt-1 text-xs text-stone-500">
          {t(
            "Поиск и так знает уменьшительные имена. Сюда добавляют то, чего он знать не может: девичью фамилию, «мама Лена», прозвище.",
            "Search already knows common nicknames. Add what it can’t know: a maiden name, “Aunt Lena”, a nickname.",
          )}
        </p>

        {manual.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {manual.map((alias) => (
              <li key={alias.id}>
                <form action={dropAlias} className="flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1 text-sm">
                  <input type="hidden" name="aliasId" value={alias.id} />
                  <span>{alias.alias}</span>
                  <button className="text-stone-400 hover:text-red-700" aria-label={t("Убрать", "Remove")}>×</button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}

        <form action={addAliasAction} className="mt-3 flex gap-2">
          <input
            name="alias" placeholder={t("Например, «мама Лена»", "For example, “Aunt Lena”")}
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">{t("Добавить", "Add")}</button>
        </form>

        {auto.length > 0 ? (
          <p className="mt-3 text-xs text-stone-400">
            {t("Само знает", "Already knows")}: {auto.map((alias) => alias.alias).join(", ")}
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-card p-4 text-sm">
        <h2 className="font-medium">{t("Именная ссылка", "Personal link")}</h2>
        <p className="mt-2 font-mono text-xs break-all text-stone-600">
          /i/{event.slug}/{guest.linkToken}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {guest.linkOpenedAt
            ? t("Открыта", "Opened") + ` ${new Intl.DateTimeFormat(localeOf(lang), { dateStyle: "short", timeStyle: "short" }).format(guest.linkOpenedAt)}`
            : t("Ещё не открывали", "Not opened yet")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={`/i/${event.slug}/${guest.linkToken}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            {t("открыть как гость", "open as guest")}
          </a>
          <form action={reissue}>
            <button className="text-xs text-stone-500 underline">{t("перевыпустить", "reissue")}</button>
          </form>
          <span className="text-xs text-stone-400">
            {t("Перевыпуск гасит старую ссылку — если она ушла не тому человеку.", "Reissuing disables the old link — useful if it went to the wrong person.")}
          </span>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-card p-4 text-sm">
        <h2 className="font-medium">{t("Спутник", "Plus-one")}</h2>
        <p className="mt-2 text-stone-600">
          {guest.plusOneAllowed ? t("Может прийти с парой", "Can bring a +1") : t("Приглашён один", "Invited alone")}
          {guest.plusOneName ? t(` · назвал: ${guest.plusOneName}`, ` · named: ${guest.plusOneName}`) : ""}
        </p>
        <form action={togglePlusOne} className="mt-2">
          <input type="hidden" name="allowed" value={guest.plusOneAllowed ? "0" : "1"} />
          <button className="text-xs text-stone-500 underline">
            {guest.plusOneAllowed ? t("запретить пару", "remove +1") : t("разрешить пару", "allow +1")}
          </button>
        </form>
      </section>

      {photos.length > 0 || wishes.length > 0 ? (
        <section className="mt-4 rounded-xl border border-stone-200 bg-card p-4 text-sm">
          <h2 className="font-medium">{t("Что прислал", "What they sent")}</h2>
          <p className="mt-2 text-stone-600">
            {t(`Фотографий: ${photos.length} · пожеланий: ${wishes.length}`, `Photos: ${photos.length} · wishes: ${wishes.length}`)}
          </p>
        </section>
      ) : null}

      <form action={toArchive} className="mt-6">
        <button className="text-sm text-stone-400 hover:text-red-700">
          {t("Убрать гостя в архив", "Archive guest")}
        </button>
        <span className="ml-3 text-xs text-stone-400">
          {t("Место за столом освободится, ответы и фотографии останутся.", "Their seat will be freed up; RSVP answers and photos will stay.")}
        </span>
      </form>
    </main>
  );
}
