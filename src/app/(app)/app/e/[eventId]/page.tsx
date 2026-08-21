/**
 * Дашборд мероприятия.
 *
 * Открывается по адресу самого мероприятия — раньше он отдавал 404,
 * потому что все переходы вели сразу на вкладки. Это первый экран
 * в день свадьбы, поэтому здесь не «аналитика», а четыре вопроса,
 * которые задают вслух: сколько придёт, что с рассадкой, что на
 * модерации и жив ли экран.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { countGuests } from "@/server/repositories/guests";
import { countPhotos } from "@/server/services/photos";
import { countWishes } from "@/server/services/wishes";
import { rsvpSummary } from "@/server/services/rsvp";
import { listScreenTokens } from "@/server/services/screen";
import { formatEventDateTime } from "@/lib/format-datetime";

export const dynamic = "force-dynamic";

/** Режим экрана человеку показываем словами, а не кодом перечисления. */
const SCREEN_MODE: Record<string, string> = {
  MIXED: "фото и пожелания",
  PHOTOS: "только фото",
  WISHES: "только пожелания",
  RAFFLE: "розыгрыш",
  IDLE: "заставка",
};

/**
 * «Сейчас» для серверного рендера.
 *
 * Обёртка не ради красоты: линтер React запрещает вызывать `Date.now()`
 * в теле компонента — для клиентского это правильная строгость, а
 * серверный рендерится один раз на запрос, и текущее время ему нужно.
 * Выносим вызов за пределы рендера вместо того, чтобы глушить правило.
 */
async function currentTime(): Promise<number> {
  return Date.now();
}

/** «Экран на связи» — если пульс приходил в последние две минуты. */
function isLive(lastSeenAt: Date | null, now: number): boolean {
  return lastSeenAt !== null && now - lastSeenAt.getTime() < 120_000;
}

function daysUntil(date: Date, now: number): string {
  const days = Math.ceil((date.getTime() - now) / 86_400_000);
  if (days < 0) return "прошла";
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  const mod100 = days % 100;
  const mod10 = days % 10;
  const word =
    mod100 >= 11 && mod100 <= 14 ? "дней" : mod10 === 1 ? "день" : mod10 >= 2 && mod10 <= 4 ? "дня" : "дней";
  return `через ${days} ${word}`;
}

export default async function EventDashboard({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  const now = await currentTime();

  const [guests, rsvp, photos, wishes, screens] = await Promise.all([
    countGuests(ctx),
    rsvpSummary(ctx.eventId),
    countPhotos(ctx.eventId),
    countWishes(ctx.eventId),
    listScreenTokens(ctx, eventId),
  ]);

  const liveScreen = screens.find(
    (screen) => !screen.revokedAt && isLive(screen.lastSeenAt, now),
  );

  const tiles = [
    {
      href: `/app/e/${eventId}/rsvp`,
      value: `${rsvp.accepted}`,
      label: "придут",
      hint: `${rsvp.pending} не ответили · ${rsvp.notOpened} не открыли ссылку`,
    },
    {
      href: `/app/e/${eventId}/seating`,
      value: `${guests.seated}`,
      label: "рассажено",
      hint:
        rsvp.accepted > guests.seated
          ? `без места: ${rsvp.accepted - guests.seated}`
          : "все, кто придёт, за столами",
    },
    {
      href: `/app/e/${eventId}/photos`,
      value: `${photos.pending}`,
      label: "фото на модерации",
      hint: `опубликовано ${photos.approved}`,
    },
    {
      href: `/app/e/${eventId}/wishes`,
      value: `${wishes.pending}`,
      label: "пожеланий ждут",
      hint: `на экране ${wishes.approved}`,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <p className="text-sm text-stone-500">
        {formatEventDateTime(event.eventDate, event.timezone)} · {daysUntil(event.eventDate, now)}
        {event.venueName ? ` · ${event.venueName}` : ""}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400"
          >
            <p className="text-3xl font-semibold">{tile.value}</p>
            <p className="text-sm text-stone-600">{tile.label}</p>
            <p className="mt-1 text-xs text-stone-400">{tile.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <p className="font-medium">На кухню</p>
          <p className="mt-1 text-stone-600">
            {rsvp.meals.map((meal) => `${meal.title}: ${meal.count}`).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Всего гостей в списке: {guests.total}, из них спутников: {rsvp.plusOnes}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <p className="font-medium">Экран в зале</p>
          <p className="mt-1 text-stone-600">
            {liveScreen
              ? `${liveScreen.label} на связи, режим «${SCREEN_MODE[event.screenMode] ?? event.screenMode}»`
              : screens.some((screen) => !screen.revokedAt)
                ? "ссылка есть, но экран не подключён"
                : "ссылка для проектора ещё не создана"}
          </p>
          <Link href={`/app/e/${eventId}/screen`} className="mt-2 inline-block text-xs underline">
            Управление экраном
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <a href={`/e/${event.shortCode}`} target="_blank" rel="noreferrer" className="underline">
          Вход гостя по QR ↗
        </a>
        <a href={`/i/${event.slug}`} target="_blank" rel="noreferrer" className="underline">
          Публичное приглашение ↗
        </a>
        <Link href={`/app/e/${eventId}/print`} className="underline">
          Печать и QR
        </Link>
      </div>
    </main>
  );
}
