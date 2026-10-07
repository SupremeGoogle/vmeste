/**
 * Альбом после свадьбы: одобренные снимки гостей, открывается на
 * следующий день по времени площадки.
 *
 * «За моим столом» — снимки, которые прислали гости этого стола. Людей на
 * фотографиях по лицам не ищем: это и ошибалось бы, и требовало бы
 * согласия каждого гостя.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { identifyByEventSession } from "@/server/guest-access/identify";
import { findEventByShortCode } from "@/server/repositories/events";
import { albumIsOpen, albumOpeningLabel } from "@/lib/wedding-day";
import { albumFilter, albumScope, type AlbumScope } from "@/server/services/album";
import { PhotoWall } from "@/components/guest/photo-wall";
import { DownloadIcon } from "./download-icon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Альбом" };

const PAGE_SIZE = 48;

const SCOPES: [AlbumScope, string][] = [
  ["all", "Все"],
  ["mine", "Мои"],
  ["table", "Мой стол"],
];

type Props = {
  params: Promise<{ shortCode: string }>;
  searchParams: Promise<{ scope?: string; page?: string }>;
};

export default async function AlbumPage({ params, searchParams }: Props) {
  const { shortCode } = await params;
  const query = await searchParams;
  const event = await findEventByShortCode(shortCode);
  if (!event) notFound();
  const guest = await identifyByEventSession(event.id);
  if (!guest) redirect(`/g/${event.shortCode}`);

  const settings = await db.event.findFirst({ where: { id: event.id }, select: { albumEnabled: true } });
  const enabled = settings?.albumEnabled ?? false;
  const open = albumIsOpen({ ...event, albumEnabled: enabled });
  const scope = albumScope(query.scope);
  const path = `/g/${event.shortCode}/album`;
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);

  const header = (
    <>
      <Link href={`/g/${event.shortCode}`} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-muted hover:text-ink">
        ← Моя страница
      </Link>
      <header className="mt-4 text-center">
        <h1 className="font-serif text-[40px] leading-tight sm:text-5xl">Альбом</h1>
        <p className="mt-1 text-[15px] text-muted">{event.title} · {dateLabel}</p>
      </header>
    </>
  );

  if (!open) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-16 sm:pt-8">
        {header}
        <p className="guest-card mt-8 p-6 text-center text-[15px] leading-relaxed text-muted">
          {enabled
            ? `Альбом откроется ${albumOpeningLabel(event)}, на следующий день после свадьбы. Ссылка та же — загляните сюда.`
            : "Пара пока закрыла альбом."}
        </p>
      </main>
    );
  }

  const where = await albumFilter(event.id, guest.guestId, scope);
  const total = await db.photo.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, pages) : 1;
  const [photos, seat] = await Promise.all([
    db.photo.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, width: true, height: true },
    }),
    scope === "table"
      ? db.seat.findFirst({ where: { eventId: event.id, guestId: guest.guestId }, select: { table: { select: { label: true } } } })
      : null,
  ]);

  const empty =
    scope === "mine" ? "Вы не присылали фотографий."
    : scope === "table" && !seat ? "Вашего стола нет в рассадке."
    : "Здесь пока нет снимков.";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
      {header}

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <nav aria-label="Какие снимки показать" className="flex gap-1 rounded-full border border-line bg-card/70 p-1 text-[15px]">
          {SCOPES.map(([value, label]) => (
            <Link
              key={value}
              href={`${path}?scope=${value}`}
              aria-current={scope === value ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-muted transition-colors hover:text-ink aria-[current=page]:bg-paper aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          ))}
        </nav>
        {total > 0 ? (
          <a href={`${path}/download?scope=${scope}`} className="guest-button inline-flex min-h-12 items-center gap-2.5 rounded-2xl px-5 text-[15px] font-medium">
            <DownloadIcon />
            Скачать архив · {total}
          </a>
        ) : null}
      </div>

      {scope === "table" && seat ? (
        <p className="mt-4 text-center text-[15px] text-muted">Снимки гостей за столом «{seat.table.label}»</p>
      ) : null}

      {photos.length > 0 ? (
        <div className="mt-6">
          <PhotoWall key={`${scope}-${page}`} eventId={event.id} photos={photos} download />
        </div>
      ) : (
        <p className="guest-card mt-6 p-6 text-center text-[15px] text-muted">{empty}</p>
      )}

      {pages > 1 ? (
        <nav aria-label="Страницы альбома" className="mt-8 flex items-center justify-center gap-6 text-[15px]">
          {page > 1 ? <Link href={`${path}?scope=${scope}&page=${page - 1}`} className="inline-flex min-h-11 items-center">← Назад</Link> : null}
          <span className="text-muted">{page} из {pages}</span>
          {page < pages ? <Link href={`${path}?scope=${scope}&page=${page + 1}`} className="inline-flex min-h-11 items-center">Дальше →</Link> : null}
        </nav>
      ) : null}

      <p className="mt-12 text-center text-sm text-muted">
        Альбом собран в <Link href="/" className="underline decoration-line underline-offset-4 hover:text-ink">«Вместе»</Link>
      </p>
    </main>
  );
}
