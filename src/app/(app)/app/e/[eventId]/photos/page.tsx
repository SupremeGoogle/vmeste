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
  countPhotos, deletePhoto, listApprovedPhotos, listPendingPhotos, listRejectedPhotos, moderatePhoto,
} from "@/server/services/photos";
import { ModerationQueue } from "@/components/photos/moderation-queue";
import { PhotoShelf } from "@/components/photos/photo-shelf";
import { NSFW_FLAG } from "@/server/images/nsfw";
import { getUiLang } from "@/server/i18n";
import { makeT } from "@/lib/i18n";

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
  const lang = await getUiLang();
  const t = makeT(lang);
  /** День для подсказки о сроках хранения — на языке кабинета. */
  const dayLabel = (date: Date) =>
    lang === "en"
      ? new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", timeZone: event.timezone }).format(date)
      : retentionDayLabel(date, event.timezone);

  const [counts, pending, approved, rejected] = await Promise.all([
    countPhotos(ctx.eventId),
    listPendingPhotos(ctx.eventId),
    listApprovedPhotos(ctx.eventId, 48),
    listRejectedPhotos(ctx.eventId),
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
        <p>{t("Свадьба администратора: фотографии хранятся без срока.", "Admin wedding: photos are kept with no time limit.")}</p>
      ) : stage === "active" ? (
        <p>{t(
          `Фотографии хранятся 15 дней после свадьбы: ${dayLabel(archiveAt(event.eventDate))} мероприятие уйдёт в архив, а ${dayLabel(purgeAt(event.eventDate))} фото удалятся насовсем. Скачайте их заранее.`,
          `Photos are kept for 15 days after the wedding: on ${dayLabel(archiveAt(event.eventDate))} the event will be archived, and on ${dayLabel(purgeAt(event.eventDate))} the photos will be deleted for good. Download them in advance.`,
        )}</p>
      ) : stage === "archived" ? (
        <p><b>{t(`Фотографии удалятся ${dayLabel(purgeAt(event.eventDate))}.`, `Photos will be deleted on ${dayLabel(purgeAt(event.eventDate))}.`)}</b> {t("Мероприятие в архиве — гости их уже не видят. Скачайте всё, что хотите сохранить.", "The event is archived — guests can no longer see them. Download everything you want to keep.")}</p>
      ) : (
        <p>{t("Фотографии удалены по сроку хранения — через 15 дней после свадьбы. Список гостей и ответы остаются.", "Photos were deleted at the end of the storage period — 15 days after the wedding. The guest list and RSVPs remain.")}</p>
      )}
      {stage !== "purged" && total > 0 ? (
        <a href={`/api/app/events/${eventId}/photos/download`} className="mt-3 inline-block rounded-xl bg-stone-900 px-4 py-2 text-white" download>
          {t(`Скачать все фото (${total}) архивом`, `Download all photos (${total}) as a ZIP`)}
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
        <h2 className="text-xl">{t("Альбом после свадьбы", "Post-wedding album")}</h2>
        <p className="mt-2 text-sm text-stone-500">{t(
          `«Наши фото» откроется ${albumOpeningLabel(event)} по времени площадки (${event.timezone}). Гости смогут скачать все одобренные снимки архивом или выбрать фотографии, присланные за их столом.`,
          `“Our photos” will open on ${albumOpeningLabel(event, "en")}, venue time (${event.timezone}). Guests will be able to download all approved photos as a ZIP or pick the photos sent from their table.`,
        )}</p>
        <form action={saveAlbum} className="mt-4 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={event.albumEnabled} /> {t("Открыть альбом гостям на следующий день", "Open the album to guests the next day")}</label><button className="rounded-xl border border-stone-300 px-4 py-2 text-sm">{t("Сохранить", "Save")}</button><Link href={`/g/${event.shortCode}/album`} className="text-sm underline">{t("Открыть страницу альбома ↗", "Open the album page ↗")}</Link></form>
      </section>

      {withoutPreview > 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t(
            `Без превью: ${withoutPreview}. Такие фото видны в галерее, но без уменьшенной копии — телефон гостя не смог её сделать.`,
            `Without a preview: ${withoutPreview}. These photos appear in the gallery, but without a smaller copy — the guest's phone couldn't create one.`,
          )}
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm text-stone-500">{t("Опубликованные", "Published")}</h2>
        {approved.length > 0 ? (
          <PhotoShelf
            eventId={eventId}
            kind="approved"
            photos={approved.map((photo) => ({ id: photo.id, guestName: photo.guest?.displayName ?? null }))}
            setStatus={setStatus}
            remove={remove}
          />
        ) : (
          <p className="mt-3 text-sm text-stone-500">{t("Одобренных фотографий пока нет.", "No approved photos yet.")}</p>
        )}
      </section>

      {/* Отклонённые — отдельно: гостям и на экран они не идут, в общий
          архив тоже, но организатор может их пересмотреть и вернуть. */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm text-stone-500">{t("Отклонённые", "Rejected")}{rejected.length ? ` · ${rejected.length}` : ""}</h2>
          {rejected.length > 0 && stage !== "purged" ? (
            <a href={`/api/app/events/${eventId}/photos/download?only=rejected`} className="text-sm text-stone-600 underline underline-offset-2" download>
              {t("Скачать отклонённые архивом", "Download rejected as a ZIP")}
            </a>
          ) : null}
        </div>
        {rejected.length > 0 ? (
          <>
            <p className="mt-1 text-xs text-stone-500">{t("Их не видят гости и экран в зале. Нажмите на снимок, чтобы рассмотреть, или «вернуть», чтобы опубликовать.", "Guests and the venue screen don't see them. Click a photo to look closer, or “restore” to publish it.")}</p>
            <PhotoShelf
              eventId={eventId}
              kind="rejected"
              photos={rejected.map((photo) => ({ id: photo.id, guestName: photo.guest?.displayName ?? null }))}
              setStatus={setStatus}
              remove={remove}
            />
          </>
        ) : (
          <p className="mt-3 text-sm text-stone-500">{t("Отклонённых нет.", "No rejected photos.")}</p>
        )}
      </section>
    </main>
  );
}
