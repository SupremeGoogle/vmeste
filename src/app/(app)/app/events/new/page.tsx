/**
 * Создание мероприятия.
 *
 * Минимум полей: название, дата и площадка. Остальное — на вкладке
 * «Настройки», уже внутри мероприятия. Организатор заводит свадьбу
 * за полгода, когда известны только эти три вещи.
 *
 * Слаг предлагается из названия, но остаётся видимым и правимым: он
 * попадает в публичную ссылку приглашения, и «svadba-1» там никому
 * не нужен.
 */
import { notifyEventCreated } from "@/server/notify/events";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/server/context";
import { createEvent } from "@/server/repositories/events";
import { slugify } from "@/lib/slugify";
import { getUiLang } from "@/server/i18n";
import { makeT, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string; first?: string }> };

export default async function NewEventPage({ searchParams }: Props) {
  const { error, first } = await searchParams;
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  const uiLang = await getUiLang();
  const t = makeT(uiLang);

  async function create(formData: FormData) {
    "use server";
    const ctx = await getOrgContext();
    if (!ctx) redirect("/login");
    const t = makeT(await getUiLang());

    const title = String(formData.get("title") ?? "").trim();
    const dateRaw = String(formData.get("eventDate") ?? "").trim();
    const timeRaw = String(formData.get("eventTime") ?? "16:00").trim() || "16:00";

    if (title.length < 2 || !dateRaw) {
      redirect("/app/events/new?error=" + encodeURIComponent(t("Нужны имена пары и дата", "Please enter the couple’s names and the date")));
    }

    const slug = slugify(String(formData.get("slug") ?? "") || title);
    if (!slug) {
      redirect("/app/events/new?error=" + encodeURIComponent(t("Не удалось составить адрес — задайте его вручную", "Couldn’t build a link from the names — please set it manually")));
    }

    const event = await createEvent(ctx, {
      title,
      slug,
      // Дата и время площадки. Часовой пояс уточняется в настройках;
      // по умолчанию — Москва, как у большинства площадок.
      eventDate: new Date(`${dateRaw}T${timeRaw}:00`),
      venueName: String(formData.get("venueName") ?? "").trim() || undefined,
      // Язык всего, что видят гости: приглашение, анкета, страница гостя.
      language: parseLang(String(formData.get("language") ?? "")) ?? (await getUiLang()),
    });

    if (!event) {
      redirect(
        "/app/events/new?error=" +
          encodeURIComponent(t(`Адрес «${slug}» уже занят другим мероприятием — задайте другой`, `The link “${slug}” is already used by another event — please choose a different one`)),
      );
    }

    notifyEventCreated(event.title, event.eventDate);
    redirect(`/app/e/${event.id}/settings`);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold">{first ? t("Ваша свадьба", "Your wedding") : t("Новое мероприятие", "New event")}</h1>
      {first && (
        <p className="mt-2 text-stone-600">
          {t("Для начала — имена и дата. Шаблон приглашения, гостей и рассадку настроите уже в кабинете свадьбы.", "Start with the names and the date. You’ll set up the invitation, guests and seating inside your wedding’s dashboard.")}
        </p>
      )}

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <form action={create} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-stone-500">{t("Имена пары", "Couple’s names")}</span>
          <input
            name="title" required minLength={2} placeholder={t("Аня и Миша", "Anna & Michael")}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-stone-400">
            {t("Сразу появятся во всех шаблонах приглашения, включая заставку.", "They’ll appear right away in every invitation template, including the intro screen.")}
          </span>
        </label>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="text-sm text-stone-500">{t("Дата", "Date")}</span>
            <input
              type="date" name="eventDate" required
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="w-32">
            <span className="text-sm text-stone-500">{t("Начало", "Start time")}</span>
            <input
              type="time" name="eventTime" defaultValue="16:00"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-stone-400">
          {t("Точной даты ещё нет? Поставьте примерную — её можно поменять в настройках.", "No exact date yet? Pick an approximate one — you can change it in settings.")}
        </p>

        <label className="block">
          <span className="text-sm text-stone-500">{t("Площадка", "Venue")}</span>
          <input
            name="venueName" placeholder={t("Усадьба Гребнево", "Rosewood Manor")}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm text-stone-500">{t("Язык приглашения и страниц гостей", "Invitation & guest pages language")}</span>
          <select
            name="language" defaultValue={uiLang}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <span className="mt-1 block text-xs text-stone-400">
            {t("На этом языке гости увидят приглашение, анкету и свою страницу. Можно поменять в настройках.", "Guests will see the invitation, RSVP form and their guest page in this language. You can change it later in settings.")}
          </span>
        </label>

        <label className="block">
          <span className="text-sm text-stone-500">{t("Адрес приглашения (необязательно)", "Invitation link (optional)")}</span>
          <input
            name="slug" placeholder="anya-misha"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
          />
          <span className="mt-1 block text-xs text-stone-400">
            {t("Попадёт в публичную ссылку: /i/anya-misha. Пусто — составим из названия.", "Used in the public link: /i/anya-misha. Leave blank and we’ll build it from the names.")}
          </span>
        </label>

        <button className="rounded-lg bg-stone-900 px-5 py-2.5 text-white" data-rybbit-event="event_create">{t("Создать", "Create")}</button>
      </form>
    </main>
  );
}
