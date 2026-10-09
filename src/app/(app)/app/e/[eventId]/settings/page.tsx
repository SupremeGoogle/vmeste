/**
 * Настройки мероприятия.
 *
 * Здесь собрано всё, что иначе пришлось бы править в базе руками: дата и
 * площадка, часовой пояс, что включено для гостей. Меню и бар — в анкете гостя (конструктор).
 * Проверка этапа 8 — «прогон без вмешательства в БД» — по сути про эту
 * страницу: пока чего-то из неё нет, репетиция не проходится.
 */
import { revalidatePath, updateTag } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import Link from "next/link";
import {
  getEvent, rotateGuestSecret, setEventStatus, updateEventSettings,
} from "@/server/repositories/events";
import { formatEventDateTime } from "@/lib/format-datetime";
import { allEventTags } from "@/lib/cache-tags";
import { archiveAt, purgeAt, retentionDayLabel, retentionStage } from "@/lib/retention";
import { isRetentionExempt } from "@/server/services/retention";
import { getUiLang } from "@/server/i18n";
import { makeT, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Пояса, в которых реально играют свадьбы у русскоязычного организатора. */
const TIMEZONES = [
  "Europe/Kaliningrad", "Europe/Moscow", "Europe/Samara", "Asia/Yekaterinburg",
  "Asia/Omsk", "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Yakutsk",
  "Asia/Vladivostok", "Europe/Kyiv", "Europe/Minsk", "Asia/Almaty", "Asia/Tbilisi",
];

/** `datetime-local` хочет местное время площадки, а в базе лежит UTC. */
function toLocalInput(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Обратный перевод: «18 сентября 16:00 во Владивостоке» → момент в UTC.
 * Смещение вычисляется через `Intl`, а не таблицей: летнее время и
 * очередная реформа поясов не должны ломать дату свадьбы.
 */
function fromLocalInput(value: string, timezone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, y, mo, d, h, mi] = match.map(Number) as unknown as number[];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = offsetAt(new Date(guess), timezone);
  // Второй проход: у границы перевода часов смещение считается уже
  // по правильной дате.
  const corrected = guess - offset;
  const offset2 = offsetAt(new Date(corrected), timezone);
  return new Date(guess - offset2);
}

function offsetAt(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    get("hour") % 24, get("minute"), get("second"),
  );
  return asUtc - date.getTime();
}

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function SettingsPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { saved, error } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const lang = await getUiLang();
  const t = makeT(lang);
  /** «12 сентября» / «September 12» — день, когда сработает срок хранения. */
  const dayLabel = (date: Date) =>
    lang === "en"
      ? new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", timeZone: event.timezone }).format(date)
      : retentionDayLabel(date, event.timezone);

  async function save(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const timezone = String(formData.get("timezone") ?? "Europe/Moscow");
    const language = parseLang(String(formData.get("language") ?? "")) ?? undefined;
    const before = language ? await getEvent(ctx, eventId) : null;
    const when = fromLocalInput(String(formData.get("eventDate") ?? ""), timezone);
    if (!when) {
      revalidatePath(`/app/e/${eventId}/settings`);
      return;
    }

    await updateEventSettings(ctx, eventId, {
      title: String(formData.get("title") ?? "").trim().slice(0, 120) || "Свадьба",
      eventDate: when,
      timezone,
      venueName: String(formData.get("venueName") ?? "").trim() || null,
      venueAddr: String(formData.get("venueAddr") ?? "").trim() || null,
      allowPlusOne: formData.get("allowPlusOne") === "on",
      photosEnabled: formData.get("photosEnabled") === "on",
      wishesEnabled: formData.get("wishesEnabled") === "on",
      raffleEnabled: formData.get("raffleEnabled") === "on",
      qrEntryOpen: formData.get("qrEntryOpen") === "on",
      photoLimitPerGuest: Math.min(20, Math.max(1, Number(formData.get("photoLimit")) || 5)),
      language,
    });
    // Язык меняет всё, что видят гости, — их закешированные страницы
    // сбрасываем сразу, а не ждём, пока кеш истечёт сам.
    if (before && language && before.language !== language) {
      for (const tag of allEventTags(eventId, before.slug)) updateTag(tag);
    }
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  async function setStatus(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const status = String(formData.get("status"));
    if (status !== "DRAFT" && status !== "PUBLISHED" && status !== "ARCHIVED") return;
    // Через 10 дней после свадьбы мероприятие в архиве насовсем: фоновая
    // задача всё равно вернула бы его туда через час.
    const current = await getEvent(ctx, eventId);
    if (!current) return;
    if (status !== "ARCHIVED" && retentionStage(current.eventDate) !== "active" && !(await isRetentionExempt(ctx.orgId))) return;
    await setEventStatus(ctx, eventId, status);
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  /**
   * Спасательный круг из PLAN.md §5.7.
   *
   * Кеш гостевых страниц живёт минутами и сбрасывается сам при правках,
   * но в день свадьбы «подождите минуту» — плохой ответ, а «я не понимаю,
   * почему гость видит старое» — обычная ситуация. Кнопка сбрасывает
   * все теги мероприятия разом, и объяснять ничего не нужно.
   */
  async function dropCache() {
    "use server";
    const ctx = await requireEventContext(eventId);
    const event = await getEvent(ctx, eventId);
    if (!event) return;

    for (const tag of allEventTags(eventId, event.slug)) updateTag(tag);
    revalidatePath("/", "layout");
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  async function rotate() {
    "use server";
    const ctx = await requireEventContext(eventId);
    await rotateGuestSecret(ctx, eventId);
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  // Свадьбы суперадмина под сроки хранения не попадают (retentionExemptEmails).
  const stage = (await isRetentionExempt(event.orgId)) ? "exempt" : retentionStage(event.eventDate);

  const toggles = [
    { name: "allowPlusOne", label: t("Разрешить +1", "Allow +1"), checked: event.allowPlusOne },
    { name: "photosEnabled", label: t("Приём фотографий", "Photo uploads"), checked: event.photosEnabled },
    { name: "wishesEnabled", label: t("Приём пожеланий", "Wishes from guests"), checked: event.wishesEnabled },
    { name: "raffleEnabled", label: t("Розыгрыш", "Raffle"), checked: event.raffleEnabled },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {saved ? (
        <p className="mb-4 rounded-lg bg-stone-900 px-4 py-3 text-sm text-white">{t("Сохранено", "Saved")}</p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <form action={save} className="space-y-4 rounded-xl border border-stone-200 bg-card p-5">
        <label className="block">
          <span className="text-sm text-stone-500">{t("Название", "Name")}</span>
          <input
            name="title" defaultValue={event.title}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex-1">
            <span className="text-sm text-stone-500">{t("Дата и время на площадке", "Date and time at the venue")}</span>
            <input
              type="datetime-local" name="eventDate"
              defaultValue={toLocalInput(event.eventDate, event.timezone)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="flex-1">
            <span className="text-sm text-stone-500">{t("Часовой пояс площадки", "Venue time zone")}</span>
            <select
              name="timezone" defaultValue={event.timezone}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              {[...new Set([event.timezone, ...TIMEZONES])].map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-stone-500">
          {t("Сейчас", "Currently")}: {formatEventDateTime(event.eventDate, event.timezone, lang)} {t("по времени площадки.", "venue time.")}
          {" "}{t("Гость увидит это же время, где бы он ни открыл приглашение.", "Guests see this same time wherever they open the invitation.")}
        </p>

        <label className="block">
          <span className="text-sm text-stone-500">{t("Язык приглашения и страниц гостей", "Invitation & guest pages language")}</span>
          <select
            name="language" defaultValue={event.language === "en" ? "en" : "ru"}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <span className="mt-1 block text-xs text-stone-500">
            {t("На этом языке гости видят приглашение, анкету, свою страницу, экран в зале и печатные карточки. Язык кабинета — отдельно, переключатель в шапке.", "Guests see the invitation, RSVP form, guest page, venue screen and printed cards in this language. Your dashboard language is separate — use the switch in the header.")}
          </span>
        </label>

        <label className="block">
          <span className="text-sm text-stone-500">{t("Площадка", "Venue")}</span>
          <input
            name="venueName" defaultValue={event.venueName ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-500">{t("Адрес площадки", "Venue address")}</span>
          <input
            name="venueAddr" defaultValue={event.venueAddr ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          {toggles.map((toggle) => (
            <label key={toggle.name} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={toggle.name} defaultChecked={toggle.checked} />
              {toggle.label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            {t("Фото на гостя:", "Photos per guest:")}
            <input
              type="number" name="photoLimit" min={1} max={20}
              defaultValue={event.photoLimitPerGuest}
              className="w-16 rounded border border-stone-300 px-2 py-1"
            />
          </label>
        </div>

        {/* Вход по QR на свадьбе: по умолчанию — только те, кто в списке. */}
        <label className="flex items-start gap-3 rounded-lg border border-stone-200 px-4 py-3 text-sm">
          <input type="checkbox" name="qrEntryOpen" defaultChecked={event.qrEntryOpen} className="mt-0.5" />
          <span>
            <span className="text-stone-900">{t("Пускать по QR гостей, которых нет в списке", "Let guests who aren’t on the list check in by QR")}</span>
            <span className="mt-0.5 block text-xs text-stone-500">
              {t(
                "Выключено — на свадьбе войти можно только найдя себя в списке. Включено — гость, которого нет в списке, пишет своё имя и входит; в списке он появится с пометкой «добавился сам».",
                "Off — at the wedding, guests can only check in by finding their name on the list. On — a guest who isn’t on the list enters their name and checks in; they’ll appear on your list marked “added themselves”.",
              )}
            </span>
          </span>
        </label>

        <button className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white">{t("Сохранить", "Save")}</button>
      </form>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">{t("Меню и бар", "Menu and bar")}</h2>
          <p className="mt-1 text-xs text-stone-500">{t("Блюда, напитки и другие вопросы гостям теперь настраиваются в анкете гостя.", "Meals, drinks and other questions for guests are now set up in the RSVP form.")}</p>
        </div>
        <Link href={`/app/e/${eventId}/invite/form`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
          {t("Открыть анкету гостя", "Open RSVP form")}
        </Link>
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-card p-5">
        <h2 className="text-sm font-medium">{t("Публикация и доступ", "Publishing and access")}</h2>
        {stage === "exempt" ? (
          <p className="mt-3 text-xs text-stone-500">{t("Свадьба администратора: сроки хранения не действуют — в архив сама не уйдёт, фото не удалятся.", "Admin wedding: retention limits don’t apply — it won’t be archived automatically and photos won’t be deleted.")}</p>
        ) : stage !== "active" ? (
          <p className="mt-3 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-600">
            {t("Свадьба прошла больше 10 дней назад — мероприятие в архиве. Гостевые ссылки не работают.", "The wedding was more than 10 days ago, so the event has been archived. Guest links no longer work.")}
            {stage === "archived"
              ? t(` Фотографии удалятся ${dayLabel(purgeAt(event.eventDate))} — скачайте их в разделе «Фото».`, ` Photos will be deleted on ${dayLabel(purgeAt(event.eventDate))} — download them in the Photos section.`)
              : t(" Фотографии удалены по сроку хранения.", " Photos have been deleted under the retention policy.")}
            {" "}{t("Если дата свадьбы указана неверно — исправьте её выше, и сроки сдвинутся.", "If the wedding date is wrong, correct it above and the deadlines will shift.")}
          </p>
        ) : (
          <p className="mt-3 text-xs text-stone-500">
            {t(
              `${dayLabel(archiveAt(event.eventDate))} мероприятие само уйдёт в архив, ещё через 5 дней фотографии удалятся.`,
              `On ${dayLabel(archiveAt(event.eventDate))} the event will be archived automatically, and 5 days later the photos will be deleted.`,
            )}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {stage === "active" || stage === "exempt" ? <>
          <form action={setStatus}>
            <input
              type="hidden" name="status"
              value={event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
            />
            <button className="rounded-lg border border-stone-300 px-4 py-2">
              {event.status === "PUBLISHED" ? t("Снять с публикации", "Unpublish") : t("Опубликовать", "Publish")}
            </button>
          </form>
          {event.status !== "ARCHIVED" ? (
            <form action={setStatus}>
              <input type="hidden" name="status" value="ARCHIVED" />
              <button className="rounded-lg border border-stone-300 px-4 py-2">
                {t("Убрать в архив", "Archive")}
              </button>
            </form>
          ) : (
            <form action={setStatus}>
              <input type="hidden" name="status" value="DRAFT" />
              <button className="rounded-lg border border-stone-300 px-4 py-2">
                {t("Вернуть из архива", "Restore from archive")}
              </button>
            </form>
          )}
          </> : null}
          <form action={rotate}>
            <button className="rounded-lg border border-stone-300 px-4 py-2">
              {t("Сбросить гостевые сессии", "Reset guest sessions")}
            </button>
          </form>
          <form action={dropCache}>
            <button className="rounded-lg border border-stone-300 px-4 py-2">
              {t("Сбросить кеш мероприятия", "Clear event cache")}
            </button>
          </form>
          <span className="text-xs text-stone-500">
            {t(
              "Архив прячет мероприятие от гостей: именные ссылки и вход по QR перестают работать, данные остаются. Сброс кеша нужен, если гость видит вчерашние данные и ждать минуту нельзя. Сброс разлогинивает всех гостей — если ссылка попала в общий чат. Сами именные ссылки продолжают работать.",
              "Archiving hides the event from guests: personal links and QR check-in stop working, but your data stays. Clear the cache if a guest sees outdated info and you can’t wait a minute. Resetting sessions signs out all guests — useful if a link ended up in a group chat. The personal links themselves keep working.",
            )}
          </span>
        </div>
      </section>
    </main>
  );
}
