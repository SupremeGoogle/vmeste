/**
 * Фотографии гостя: своя загрузка и общая галерея одобренного.
 *
 * Единственная гостевая страница с клиентским кодом — иначе никак:
 * превью режется в canvas, а файл уходит в хранилище напрямую.
 * Без JavaScript загрузка невозможна в принципе, поэтому вместо
 * «запасного пути» здесь честная надпись.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { guestQuota, listApprovedPhotos, listGuestPhotos } from "@/server/services/photos";
import { PhotoUploader } from "@/components/photos/uploader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "на модерации",
  APPROVED: "опубликовано",
  REJECTED: "не подошло",
};

export default async function GuestPhotosPage({
  params,
}: {
  params: Promise<{ eventSlug: string; token: string }>;
}) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") notFound();

  const ref = { orgId: guest.orgId, eventId: guest.eventId, guestId: guest.id };
  const [quota, mine, approved] = await Promise.all([
    guestQuota(ref),
    listGuestPhotos(ref),
    listApprovedPhotos(guest.eventId, 60),
  ]);

  return (
    <main className="mx-auto max-w-2xl bg-white px-6 py-10 shadow-sm">
      <h1 className="text-center text-2xl">Фотографии</h1>
      <p className="mt-2 text-center text-sm text-stone-500">
        {guest.displayName} · {guest.event.title}
      </p>

      {quota.enabled ? (
        <div className="mt-8">
          <PhotoUploader token={token} left={quota.left} limit={quota.limit} />
          <noscript>
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Для загрузки фотографий нужен включённый JavaScript: браузер сам
              готовит уменьшенную копию и отправляет файл в хранилище.
            </p>
          </noscript>
        </div>
      ) : (
        <p className="mt-8 rounded-lg bg-stone-100 px-4 py-3 text-center text-sm text-stone-600">
          Загрузка фотографий закрыта организатором.
        </p>
      )}

      {mine.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm text-stone-500">Ваши фотографии</h2>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {mine.map((photo) => (
              <li key={photo.id} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${guest.eventId}/${photo.id}`}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  {STATUS_LABEL[photo.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm text-stone-500">Общая галерея</h2>
        {approved.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {approved.map((photo) => (
              <li key={photo.id}>
                <a href={`/api/media/${guest.eventId}/${photo.id}?size=full`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${guest.eventId}/${photo.id}`}
                    alt={photo.guest ? `Фото: ${photo.guest.displayName}` : "Фото"}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-500">
            Пока пусто. Фотографии появятся здесь после проверки организатором.
          </p>
        )}
      </section>

      <p className="mt-10 text-center">
        <a href={`/i/${eventSlug}/${token}`} className="text-sm text-stone-500 underline">
          Вернуться к приглашению
        </a>
      </p>
    </main>
  );
}
