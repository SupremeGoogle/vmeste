/**
 * Виш-лист: что паре хотелось бы получить — с картинкой и ссылкой.
 *
 * Гости видят список на своей странице и внизу приглашения и отмечают
 * «я беру этот подарок» — чтобы не подарить паре три одинаковых чайника.
 * Здесь организатор ведёт список, видит, кто что взял, и может снять
 * бронь, если гость передумал, но не дошёл до кнопки сам. Конверт с
 * реквизитами остался, но убран в раскрывающийся блок: он нужен не всем.
 */
import { revalidatePath, updateTag } from "next/cache";
import { eventTag, inviteSlugTag } from "@/lib/cache-tags";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { saveEnvelope, saveGift } from "@/server/services/gifts";
import { listAssets } from "@/server/services/assets";
import { ImagePicker } from "@/components/invite/image-picker";
import { ConfirmButton } from "@/components/invite/confirm-button";
import { SubmitButton } from "@/components/forms/submit-button";
import { getT } from "@/server/i18n";

export const dynamic = "force-dynamic";

const INPUT = "mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2 text-sm";
const PRIMARY = "rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50";
const SECONDARY = "rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-50";

/** Ответы services/gifts.ts для кабинета на английском — по русскому тексту. */
const EN_MESSAGES: Record<string, string> = {
  "Сохранено": "Saved",
  "Выберите картинку из загруженных": "Choose an image from your uploads",
  "Подарок не найден": "Gift not found",
  "Подарок сохранён": "Gift saved",
  "Подарок добавлен": "Gift added",
};

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function GiftsPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { message } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  const [gifts, assets] = await Promise.all([
    db.gift.findMany({
      where: { eventId, orgId: ctx.orgId },
      orderBy: { createdAt: "asc" },
      include: { reservation: { include: { guest: { select: { displayName: true } } } } },
    }),
    listAssets(ctx),
  ]);
  const pickerAssets = assets.map(({ id, url, alt }) => ({ id, url, alt }));
  const taken = gifts.filter((gift) => gift.reservation).length;
  const reservable = gifts.filter((gift) => gift.reservable || gift.reservation).length;
  const path = `/app/e/${eventId}/invite/wishlist`;
  const guestPath = `/g/${event.shortCode}/gifts`;

  async function done(message: string) {
    "use server";
    const t = await getT();
    message = t(message, EN_MESSAGES[message] ?? message);
    revalidatePath(path);
    revalidatePath(guestPath);
    // Подарки — раздел приглашения: гость должен увидеть правку сразу.
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(event!.slug));
    redirect(`${path}?message=${encodeURIComponent(message)}`);
  }

  async function saveSettings(data: FormData) {
    "use server";
    const result = await saveEnvelope(await requireEventContext(eventId), {
      enabled: data.get("enabled") === "on",
      label: String(data.get("label") ?? ""),
      details: String(data.get("details") ?? ""),
      url: String(data.get("url") ?? ""),
    });
    await done(result.message);
  }

  async function save(data: FormData) {
    "use server";
    const result = await saveGift(await requireEventContext(eventId), String(data.get("id") ?? ""), {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      url: String(data.get("url") ?? ""),
      imageUrl: String(data.get("imageUrl") ?? ""),
      reservable: data.get("reservable") === "on",
    });
    await done(result.message);
  }

  async function remove(data: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await db.gift.deleteMany({ where: { id: String(data.get("id")), eventId, orgId: ctx.orgId } });
    await done((await getT())("Удалено из виш-листа", "Removed from the gift list"));
  }

  async function release(data: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await db.giftReservation.deleteMany({ where: { giftId: String(data.get("id")), eventId, orgId: ctx.orgId } });
    await done((await getT())("Бронь снята", "Reservation released"));
  }

  const t = await getT();
  const giftFields = (gift?: (typeof gifts)[number]) => (
    <>
      <input type="hidden" name="id" value={gift?.id ?? ""} />
      <div className="text-sm text-stone-600">
        {t("Картинка", "Image")}
        <div className="mt-1">
          <ImagePicker eventId={eventId} name="imageUrl" value={gift?.imageUrl ?? ""} assets={pickerAssets} adjustable={false} />
        </div>
      </div>
      <label className="block text-sm text-stone-600">
        {t("Что подарить", "Gift")}
        <input name="title" required maxLength={160} defaultValue={gift?.title} placeholder={t("Кофемашина", "Espresso machine")} className={INPUT} />
      </label>
      <label className="block text-sm text-stone-600">
        {t("Уточнения", "Details")}
        <textarea name="description" rows={2} maxLength={1000} defaultValue={gift?.description} placeholder={t("Модель, цвет, где купить", "Model, color, where to buy")} className={INPUT} />
      </label>
      <label className="block text-sm text-stone-600">
        {t("Ссылка", "Link")}
        <span className="text-stone-400">{t(" — необязательно", " — optional")}</span>
        <input name="url" type="url" maxLength={2000} defaultValue={gift?.url} placeholder="https://" className={INPUT} />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input name="reservable" type="checkbox" defaultChecked={gift?.reservable ?? true} className="mt-0.5 size-4 accent-stone-900" />
        <span>
          <span className="text-stone-900">{t("Можно забронировать", "Can be reserved")}</span>
          <span className="mt-0.5 block text-stone-500">{t("Гость нажимает «Я подарю это», и подарок занят для остальных. Выключите для того, что можно дарить многим, — например, цветы или сертификаты.", "A guest taps “I’ll give this” and the gift is taken for everyone else. Turn this off for things many guests can give, like flowers or gift cards.")}</span>
        </span>
      </label>
    </>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <a href={`/app/e/${eventId}/invite?edit=1`} className="mb-2 inline-flex min-h-11 items-center text-sm text-stone-500 hover:text-stone-900">{t("← К редактору приглашения", "← Back to the invitation editor")}</a>
      <h1 className="mb-1 font-serif text-3xl text-stone-900">{t("Виш-лист", "Gift list")}</h1>
      <p className="mb-5 max-w-xl text-sm leading-relaxed text-stone-600">{t("Раздел «Виш-лист» есть в каждом шаблоне. Его заголовок и текст правятся прямо в приглашении, а подарки и реквизиты — здесь. Гости отмечают «Я подарю это», и подарок становится занятым для остальных — если у него включена бронь.", "Every template has a gift list section. Edit its heading and text right in the invitation, and manage gifts and payment details here. Guests tap “I’ll give this” and the gift is taken for everyone else — if reservations are on for it.")}</p>
      {message ? (
        <p role="status" className="mb-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p>
      ) : null}

      <form action={saveSettings} className="rounded-xl border border-stone-200 bg-card p-5">
        <label className="flex items-start gap-3 text-sm">
          <input name="enabled" type="checkbox" defaultChecked={event.giftsEnabled} className="mt-0.5 size-4 accent-stone-900" />
          <span>
            <span className="font-medium text-stone-900">{t("Показывать виш-лист в приглашении", "Show the gift list in the invitation")}</span>
            <span className="mt-0.5 block text-stone-500">
              {t("Раздел появится в приглашении и на странице гостя.", "The section will appear in the invitation and on the guest page.")}{" "}
              <a href={guestPath} target="_blank" rel="noreferrer" className="underline underline-offset-2">{t("Как это видят гости ↗", "See it as a guest ↗")}</a>
            </span>
          </span>
        </label>

        <details className="mt-5 border-t border-stone-100 pt-4">
          <summary className="cursor-pointer text-sm text-stone-600">{t("Деньги в конверте — реквизиты для перевода", "Cash gifts — payment details")}</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-stone-600">
              {t("Подпись", "Label")}
              <input name="label" required maxLength={120} defaultValue={event.giftTransferLabel} className={INPUT} />
            </label>
            <label className="block text-sm text-stone-600">
              {t("Ссылка на перевод", "Payment link")}
              <input name="url" type="url" maxLength={2000} defaultValue={event.giftTransferUrl} placeholder="https://" className={INPUT} />
              <span className="mt-1 block text-xs text-stone-500">{t("Из неё гостю рисуется QR-код.", "Guests see a QR code for this link.")}</span>
            </label>
            <label className="block text-sm text-stone-600 sm:col-span-2">
              {t("Реквизиты", "Payment details")}
              <textarea name="details" rows={3} maxLength={2000} defaultValue={event.giftTransferDetails} placeholder={t("Получатель, банк, номер телефона для СБП", "Recipient, bank, account or payment handle")} className={INPUT} />
            </label>
          </div>
        </details>

        <div className="mt-4">
          <SubmitButton className={PRIMARY}>{t("Сохранить", "Save")}</SubmitButton>
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">{t("Виш-лист", "Gift list")}</h2>
        {gifts.length > 0 ? <span className="text-sm text-stone-500">{reservable > 0 ? t(`выбрано ${taken} из ${reservable}`, `${taken} of ${reservable} reserved`) : t(`подарков: ${gifts.length}`, `gifts: ${gifts.length}`)}</span> : null}
      </div>

      <ul className="mt-3 space-y-3">
        {gifts.map((gift) => (
          <li key={gift.id} className="rounded-xl border border-stone-200 bg-card p-4">
            <div className="flex items-start gap-4">
              {gift.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- картинка из закрытого хранилища, размер заранее неизвестен.
                <img src={gift.imageUrl} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="font-medium text-stone-900">{gift.title}</p>
                {gift.description ? <p className="mt-0.5 whitespace-pre-line text-sm text-stone-600">{gift.description}</p> : null}
                {gift.url ? (
                  <a href={gift.url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block max-w-full truncate text-sm text-stone-500 underline underline-offset-2">
                    {gift.url.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                ) : null}
              </div>
              <p className={`text-sm ${gift.reservation ? "text-emerald-700" : "text-stone-400"}`}>
                {gift.reservation ? t(`берёт ${gift.reservation.guest.displayName}`, `reserved by ${gift.reservation.guest.displayName}`) : gift.reservable ? t("свободен", "available") : t("без брони", "no reservations")}
              </p>
              </div>
            </div>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-stone-500">{t("Изменить", "Edit")}</summary>
              <form action={save} className="mt-3 space-y-3">
                {giftFields(gift)}
                <SubmitButton className={PRIMARY}>{t("Сохранить", "Save")}</SubmitButton>
              </form>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-stone-100 pt-3">
                {gift.reservation ? (
                  <form action={release}>
                    <input type="hidden" name="id" value={gift.id} />
                    <ConfirmButton confirmText={t(`Снять бронь гостя ${gift.reservation.guest.displayName}? Подарок снова станет свободным.`, `Release ${gift.reservation.guest.displayName}’s reservation? The gift will be available again.`)} className="text-stone-600 underline underline-offset-2">
                      {t("Снять бронь", "Release reservation")}
                    </ConfirmButton>
                  </form>
                ) : null}
                <form action={remove}>
                  <input type="hidden" name="id" value={gift.id} />
                  <ConfirmButton confirmText={t(`Удалить «${gift.title}» из списка?`, `Remove “${gift.title}” from the list?`)} className="text-red-700 underline underline-offset-2">
                    {t("Удалить", "Delete")}
                  </ConfirmButton>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>

      {gifts.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">{t("Виш-лист пуст. Добавьте, что паре хотелось бы получить: картинку, название и ссылку.", "Your gift list is empty. Add what you’d love to receive: an image, a name and a link.")}</p>
      ) : null}

      <form action={save} className="mt-4 space-y-3 rounded-xl border border-dashed border-stone-300 p-4">
        {giftFields()}
        <SubmitButton className={SECONDARY} pendingText={t("Добавляем…", "Adding…")}>{t("Добавить в виш-лист", "Add to gift list")}</SubmitButton>
      </form>
    </main>
  );
}
