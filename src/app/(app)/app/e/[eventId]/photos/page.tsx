/**
 * Модерация фотографий.
 *
 * Сверху — очередь с горячими клавишами (клиентский компонент), снизу —
 * уже одобренное и отклонённое обычными формами. Тот же приём, что и на
 * рассадке: быстрый инструмент для основной работы и медленный, но
 * работающий всегда — для правки задним числом.
 */
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import {
  countPhotos, deletePhoto, listApprovedPhotos, listPendingPhotos, moderatePhoto,
} from "@/server/services/photos";
import { ModerationQueue } from "@/components/photos/moderation-queue";

export const dynamic = "force-dynamic";

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  const [counts, pending, approved] = await Promise.all([
    countPhotos(ctx.eventId),
    listPendingPhotos(ctx.eventId),
    listApprovedPhotos(ctx.eventId, 48),
  ]);

  async function setStatus(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const status = String(formData.get("status"));
    if (status !== "APPROVED" && status !== "REJECTED" && status !== "PENDING") return;
    await moderatePhoto(ctx, String(formData.get("photoId")), status);
    revalidatePath(`/app/e/${eventId}/photos`);
  }

  async function remove(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await deletePhoto(ctx, String(formData.get("photoId")));
    revalidatePath(`/app/e/${eventId}/photos`);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <section>
        {/* Счётчики отрисовывает сам компонент очереди: решения принимаются
            без перезагрузки страницы, и серверные цифры отставали бы. */}
        <ModerationQueue
          eventId={eventId}
          counts={counts}
          photos={pending.map((photo) => ({
            id: photo.id,
            previewOk: photo.previewOk,
            guestName: photo.guest?.displayName ?? null,
            createdAt: photo.createdAt.toISOString(),
          }))}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-sm text-stone-500">Опубликованные</h2>
        {approved.length > 0 ? (
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {approved.map((photo) => (
              <li key={photo.id} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${eventId}/${photo.id}`}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <span className="mt-1 block truncate text-xs text-stone-500">
                  {photo.guest?.displayName ?? "—"}
                </span>
                <div className="mt-1 flex justify-center gap-2 text-xs">
                  <form action={setStatus}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button className="text-stone-500 underline">снять</button>
                  </form>
                  <form action={remove}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <button className="text-stone-400 hover:text-red-700">удалить</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-500">Одобренных фотографий пока нет.</p>
        )}
      </section>
    </main>
  );
}
