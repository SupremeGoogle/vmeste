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
import Link from "next/link";
import { db } from "@/server/db";
import { albumOpeningLabel } from "@/lib/wedding-day";
import { archiveAt, purgeAt, retentionDayLabel, retentionStage } from "@/lib/retention";
import { isRetentionExempt } from "@/server/services/retention";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import {
  countPhotos, deletePhoto, listApprovedPhotos, listPendingPhotos, moderatePhoto,
} from "@/server/services/photos";
import { ModerationQueue } from "@/components/photos/moderation-queue";
import { NSFW_FLAG } from "@/server/images/nsfw";

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

  // Фото без превью на проектор не идут (телефон не смог их уменьшить).
  // Молча — значит «экран пустой, и непонятно почему», поэтому считаем вслух.
  const withoutPreview = approved.filter((photo) => !photo.previewOk).length;

  async function saveAlbum(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await db.event.updateMany({ where: { id: eventId, orgId: ctx.orgId }, data: { albumEnabled: formData.get("enabled") === "on" } });
    revalidatePath(`/app/e/${eventId}/photos`);
    revalidatePath(`/g/${event!.shortCode}`);
    revalidatePath(`/g/${event!.shortCode}/album`);
  }

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

  // Сроки хранения (lib/retention.ts): через 10 дней — архив, через 15 —
  // фото удаляются. Организатор должен узнать об этом здесь, а не постфактум.
  const stage = (await isRetentionExempt(ctx.orgId)) ? "exempt" : retentionStage(event.eventDate);
  const total = counts.pending + counts.approved;
  const retention = (
    <section className={`mb-6 rounded-2xl px-5 py-4 text-sm ${stage === "archived" ? "bg-amber-50 text-amber-900" : "border border-stone-200 bg-card text-stone-600"}`}>
      {stage === "exempt" ? (
        <p>Свадьба администратора: фотографии хранятся без срока.</p>
      ) : stage === "active" ? (
        <p>Фотографии хранятся 15 дней после свадьбы: {retentionDayLabel(archiveAt(event.eventDate), event.timezone)} мероприятие уйдёт в архив, а {retentionDayLabel(purgeAt(event.eventDate), event.timezone)} фото удалятся насовсем. Скачайте их заранее.</p>
      ) : stage === "archived" ? (
        <p><b>Фотографии удалятся {retentionDayLabel(purgeAt(event.eventDate), event.timezone)}.</b> Мероприятие в архиве — гости их уже не видят. Скачайте всё, что хотите сохранить.</p>
      ) : (
        <p>Фотографии удалены по сроку хранения — через 15 дней после свадьбы. Список гостей и ответы остаются.</p>
      )}
      {stage !== "purged" && total > 0 ? (
        <a href={`/api/app/events/${eventId}/photos/download`} className="mt-3 inline-block rounded-xl bg-stone-900 px-4 py-2 text-white" download>
          Скачать все фото ({total}) архивом
        </a>
      ) : null}
    </section>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {retention}
      <section>
        {/* Счётчики отрисовывает сам компонент очереди: решения принимаются
            без перезагрузки страницы, и серверные цифры отставали бы. */}
        <ModerationQueue
          eventId={eventId}
          counts={counts}
          photos={pending.map((photo) => ({
            id: photo.id,
            previewOk: photo.previewOk,
            nsfw: (photo.nsfwScore ?? 0) >= NSFW_FLAG,
            guestName: photo.guest?.displayName ?? null,
            createdAt: photo.createdAt.toISOString(),
          }))}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-card p-5">
        <h2 className="text-xl">Альбом после свадьбы</h2>
        <p className="mt-2 text-sm text-stone-500">«Наши фото» откроется {albumOpeningLabel(event)} по времени площадки ({event.timezone}). Гости смогут скачать все одобренные снимки архивом или выбрать фотографии, присланные за их столом.</p>
        <form action={saveAlbum} className="mt-4 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={event.albumEnabled} /> Открыть альбом гостям на следующий день</label><button className="rounded-xl border border-stone-300 px-4 py-2 text-sm">Сохранить</button><Link href={`/g/${event.shortCode}/album`} className="text-sm underline">Открыть страницу альбома ↗</Link></form>
      </section>

      {withoutPreview > 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Без превью: {withoutPreview}. Такие фото видны в галерее, но без
          уменьшенной копии — телефон гостя не смог её сделать.
        </p>
      ) : null}

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
