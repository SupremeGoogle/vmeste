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
import { localeOf, makeT, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Заголовок вкладки — на языке мероприятия, как и вся страница. */
export async function generateMetadata({ params }: { params: Promise<{ shortCode: string }> }): Promise<Metadata> {
  const event = await findEventByShortCode((await params).shortCode);
  return { title: event?.language === "en" ? "Album" : "Альбом" };
}

const PAGE_SIZE = 48;

const SCOPES: [AlbumScope, string, string][] = [
  ["all", "Все", "All"],
  ["mine", "Мои", "Mine"],
  ["table", "Мой стол", "My table"],
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
  const lang = parseLang(event.language) ?? "ru";
  const t = makeT(lang);
  const dateLabel = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);

  const header = (
    <>
      <Link href={`/g/${event.shortCode}`} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-muted hover:text-ink">
        {t("← Моя страница", "← My page")}
      </Link>
      <header className="mt-4 text-center">
        <h1 className="font-serif text-[40px] leading-tight sm:text-5xl">{t("Альбом", "Album")}</h1>
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
            ? t(`Альбом откроется ${albumOpeningLabel(event, lang)}, на следующий день после свадьбы. Ссылка та же — загляните сюда.`, `The album opens on ${albumOpeningLabel(event, lang)}, the day after the wedding. Come back to this same link.`)
            : t("Пара пока закрыла альбом.", "The couple has closed the album for now.")}
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
    scope === "mine" ? t("Вы не присылали фотографий.", "You haven’t sent any photos.")
    : scope === "table" && !seat ? t("Вашего стола нет в рассадке.", "Your table isn’t in the seating plan.")
    : t("Здесь пока нет снимков.", "There are no photos here yet.");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
      {header}

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <nav aria-label={t("Какие снимки показать", "Which photos to show")} className="flex gap-1 rounded-full border border-line bg-card/70 p-1 text-[15px]">
          {SCOPES.map(([value, ru, en]) => (
            <Link
              key={value}
              href={`${path}?scope=${value}`}
              aria-current={scope === value ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-muted transition-colors hover:text-ink aria-[current=page]:bg-paper aria-[current=page]:text-ink"
            >
              {t(ru, en)}
            </Link>
          ))}
        </nav>
        {total > 0 ? (
          <a href={`${path}/download?scope=${scope}`} className="guest-button inline-flex min-h-12 items-center gap-2.5 rounded-2xl px-5 text-[15px] font-medium">
            <DownloadIcon />
            {t("Скачать архив", "Download all")} · {total}
          </a>
        ) : null}
      </div>

      {scope === "table" && seat ? (
        <p className="mt-4 text-center text-[15px] text-muted">{t(`Снимки гостей за столом «${seat.table.label}»`, `Photos from guests at “${seat.table.label}”`)}</p>
      ) : null}

      {photos.length > 0 ? (
        <div className="mt-6">
          <PhotoWall key={`${scope}-${page}`} eventId={event.id} photos={photos} download />
        </div>
      ) : (
        <p className="guest-card mt-6 p-6 text-center text-[15px] text-muted">{empty}</p>
      )}

      {pages > 1 ? (
        <nav aria-label={t("Страницы альбома", "Album pages")} className="mt-8 flex items-center justify-center gap-6 text-[15px]">
          {page > 1 ? <Link href={`${path}?scope=${scope}&page=${page - 1}`} className="inline-flex min-h-11 items-center">{t("← Назад", "← Back")}</Link> : null}
          <span className="text-muted">{page} {t("из", "of")} {pages}</span>
          {page < pages ? <Link href={`${path}?scope=${scope}&page=${page + 1}`} className="inline-flex min-h-11 items-center">{t("Дальше →", "Next →")}</Link> : null}
        </nav>
      ) : null}

      <p className="mt-12 text-center text-sm text-muted">
        {t("Альбом собран в ", "Album made with ")}<Link href={lang === "en" ? "/en" : "/"} className="underline decoration-line underline-offset-4 hover:text-ink">{t("«Вместе»", "Vmeste")}</Link>
      </p>
    </main>
  );
}
