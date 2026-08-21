/**
 * Настройки мероприятия.
 *
 * Здесь собрано всё, что иначе пришлось бы править в базе руками: дата и
 * площадка, часовой пояс, что включено для гостей, меню на ужин.
 * Проверка этапа 8 — «прогон без вмешательства в БД» — по сути про эту
 * страницу: пока чего-то из неё нет, репетиция не проходится.
 */
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import {
  addMealOption, getEvent, listMealOptions, rotateGuestSecret, setEventStatus,
  toggleMealOption, updateEventSettings,
} from "@/server/repositories/events";
import { formatEventDateTime } from "@/lib/format-datetime";

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
  const meals = await listMealOptions(ctx, eventId);

  async function save(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const timezone = String(formData.get("timezone") ?? "Europe/Moscow");
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
      photoLimitPerGuest: Math.min(20, Math.max(1, Number(formData.get("photoLimit")) || 5)),
    });
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  async function addMeal(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await addMealOption(ctx, eventId, String(formData.get("title") ?? ""));
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  async function toggleMeal(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await toggleMealOption(ctx, eventId, String(formData.get("mealId")));
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  async function setStatus(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const status = String(formData.get("status"));
    if (status !== "DRAFT" && status !== "PUBLISHED" && status !== "ARCHIVED") return;
    await setEventStatus(ctx, eventId, status);
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  async function rotate() {
    "use server";
    const ctx = await requireEventContext(eventId);
    await rotateGuestSecret(ctx, eventId);
    revalidatePath(`/app/e/${eventId}/settings`);
  }

  const toggles = [
    { name: "allowPlusOne", label: "Разрешить +1", checked: event.allowPlusOne },
    { name: "photosEnabled", label: "Приём фотографий", checked: event.photosEnabled },
    { name: "wishesEnabled", label: "Приём пожеланий", checked: event.wishesEnabled },
    { name: "raffleEnabled", label: "Розыгрыш", checked: event.raffleEnabled },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      {saved ? (
        <p className="mb-4 rounded-lg bg-stone-900 px-4 py-3 text-sm text-white">Сохранено</p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <form action={save} className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <label className="block">
          <span className="text-sm text-stone-500">Название</span>
          <input
            name="title" defaultValue={event.title}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex-1">
            <span className="text-sm text-stone-500">Дата и время на площадке</span>
            <input
              type="datetime-local" name="eventDate"
              defaultValue={toLocalInput(event.eventDate, event.timezone)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="flex-1">
            <span className="text-sm text-stone-500">Часовой пояс площадки</span>
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
          Сейчас: {formatEventDateTime(event.eventDate, event.timezone)} по времени площадки.
          Гость увидит это же время, где бы он ни открыл приглашение.
        </p>

        <label className="block">
          <span className="text-sm text-stone-500">Площадка</span>
          <input
            name="venueName" defaultValue={event.venueName ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-500">Адрес площадки</span>
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
            Фото на гостя:
            <input
              type="number" name="photoLimit" min={1} max={20}
              defaultValue={event.photoLimitPerGuest}
              className="w-16 rounded border border-stone-300 px-2 py-1"
            />
          </label>
        </div>

        <button className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white">Сохранить</button>
      </form>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Меню на ужин</h2>
        <p className="mt-1 text-xs text-stone-500">
          Из этого списка гость выбирает в форме ответа. Выключенное блюдо
          пропадает из формы, но остаётся в сводке для кухни — у тех, кто уже выбрал.
        </p>
        <ul className="mt-3 space-y-2">
          {meals.map((meal) => (
            <li key={meal.id} className="flex items-center justify-between gap-3 text-sm">
              <span className={meal.active ? "" : "text-stone-400 line-through"}>
                {meal.title}
                <span className="ml-2 text-xs text-stone-400">выбрали: {meal._count.guests}</span>
              </span>
              <form action={toggleMeal}>
                <input type="hidden" name="mealId" value={meal.id} />
                <button className="text-xs text-stone-500 underline">
                  {meal.active ? "выключить" : "включить"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addMeal} className="mt-3 flex gap-2">
          <input
            name="title" placeholder="Например, «Рыба»"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Добавить</button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Публикация и доступ</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <form action={setStatus}>
            <input
              type="hidden" name="status"
              value={event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
            />
            <button className="rounded-lg border border-stone-300 px-4 py-2">
              {event.status === "PUBLISHED" ? "Снять с публикации" : "Опубликовать"}
            </button>
          </form>
          {event.status !== "ARCHIVED" ? (
            <form action={setStatus}>
              <input type="hidden" name="status" value="ARCHIVED" />
              <button className="rounded-lg border border-stone-300 px-4 py-2">
                Убрать в архив
              </button>
            </form>
          ) : (
            <form action={setStatus}>
              <input type="hidden" name="status" value="DRAFT" />
              <button className="rounded-lg border border-stone-300 px-4 py-2">
                Вернуть из архива
              </button>
            </form>
          )}
          <form action={rotate}>
            <button className="rounded-lg border border-stone-300 px-4 py-2">
              Сбросить гостевые сессии
            </button>
          </form>
          <span className="text-xs text-stone-500">
            Архив прячет мероприятие от гостей: именные ссылки и вход по QR
            перестают работать, данные остаются.
            Сброс разлогинивает всех гостей — если ссылка попала в общий чат.
            Сами именные ссылки продолжают работать.
          </span>
        </div>
      </section>
    </main>
  );
}
