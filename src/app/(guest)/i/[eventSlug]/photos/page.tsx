/**
 * Фотографии для гостя, вошедшего по QR.
 *
 * То же самое, что `/i/[slug]/[token]/photos`, но гость опознан по cookie,
 * а не по токену в адресе: в день свадьбы именной ссылки у него может
 * не быть — он пришёл, отсканировал код на входе и подтвердил «это я».
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { identifyBySlugSession } from "@/server/guest-access/identify";
import { guestQuota, listApprovedPhotos, listGuestPhotos } from "@/server/services/photos";
import { PhotoUploader } from "@/components/photos/uploader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "на модерации",
  APPROVED: "опубликовано",
  REJECTED: "не подошло",
};

export default async function GuestPhotosBySessionPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const guest = await identifyBySlugSession(eventSlug);
  // Нет cookie — значит, гость сюда не входил. Не «войдите», а 404:
  // существование мероприятия по слагу и так публично, а вот подсказывать
  // «здесь бывают чужие фото» незачем.
  if (!guest) notFound();

  const ref = { orgId: guest.orgId, eventId: guest.eventId, guestId: guest.guestId };
  const [quota, mine, approved] = await Promise.all([
    guestQuota(ref),
    listGuestPhotos(ref),
    listApprovedPhotos(guest.eventId, 60),
  ]);

  return (
    <main className="mx-auto max-w-2xl bg-white px-6 py-10 shadow-sm">
      <h1 className="text-center text-2xl">Фотографии</h1>
      <p className="mt-2 text-center text-sm text-stone-500">
        {guest.displayName} · {guest.eventTitle}
      </p>

      {quota.enabled ? (
        <div className="mt-8">
          <PhotoUploader eventId={guest.eventId} left={quota.left} limit={quota.limit} />
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${guest.eventId}/${photo.id}`}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-500">
            Пока пусто. Фотографии появятся здесь после проверки организатором.
          </p>
        )}
      </section>

      {guest.wishesEnabled ? (
        <p className="mt-10 text-center">
          <a href={`/i/${eventSlug}/wish`} className="text-sm text-stone-600 underline">
            Написать пожелание молодожёнам
          </a>
        </p>
      ) : null}
    </main>
  );
}
