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
import { redirect } from "next/navigation";
import { getOrgContext } from "@/server/context";
import { createEvent } from "@/server/repositories/events";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewEventPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  async function create(formData: FormData) {
    "use server";
    const ctx = await getOrgContext();
    if (!ctx) redirect("/login");

    const title = String(formData.get("title") ?? "").trim();
    const dateRaw = String(formData.get("eventDate") ?? "").trim();
    const timeRaw = String(formData.get("eventTime") ?? "16:00").trim() || "16:00";

    if (title.length < 2 || !dateRaw) {
      redirect("/app/events/new?error=" + encodeURIComponent("Нужны название и дата"));
    }

    const slug = slugify(String(formData.get("slug") ?? "") || title);
    if (!slug) {
      redirect("/app/events/new?error=" + encodeURIComponent("Не удалось составить адрес — задайте его вручную"));
    }

    const event = await createEvent(ctx, {
      title,
      slug,
      // Дата и время площадки. Часовой пояс уточняется в настройках;
      // по умолчанию — Москва, как у большинства площадок.
      eventDate: new Date(`${dateRaw}T${timeRaw}:00`),
      venueName: String(formData.get("venueName") ?? "").trim() || undefined,
    });

    if (!event) {
      redirect(
        "/app/events/new?error=" +
          encodeURIComponent(`Адрес «${slug}» уже занят другим мероприятием — задайте другой`),
      );
    }

    redirect(`/app/e/${event.id}/settings`);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold">Новое мероприятие</h1>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <form action={create} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-stone-500">Название</span>
          <input
            name="title" required minLength={2} placeholder="Аня и Миша"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="text-sm text-stone-500">Дата</span>
            <input
              type="date" name="eventDate" required
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="w-32">
            <span className="text-sm text-stone-500">Начало</span>
            <input
              type="time" name="eventTime" defaultValue="16:00"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-stone-500">Площадка</span>
          <input
            name="venueName" placeholder="Усадьба Гребнево"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm text-stone-500">Адрес приглашения (необязательно)</span>
          <input
            name="slug" placeholder="anya-misha"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
          />
          <span className="mt-1 block text-xs text-stone-400">
            Попадёт в публичную ссылку: /i/anya-misha. Пусто — составим из названия.
          </span>
        </label>

        <button className="rounded-lg bg-stone-900 px-5 py-2.5 text-white">Создать</button>
      </form>
    </main>
  );
}
