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

export const dynamic = "force-dynamic";

const INPUT = "mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2 text-sm";
const PRIMARY = "rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50";
const SECONDARY = "rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-50";

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
    await done("Удалено из виш-листа");
  }

  async function release(data: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await db.giftReservation.deleteMany({ where: { giftId: String(data.get("id")), eventId, orgId: ctx.orgId } });
    await done("Бронь снята");
  }

  const giftFields = (gift?: (typeof gifts)[number]) => (
    <>
      <input type="hidden" name="id" value={gift?.id ?? ""} />
      <div className="text-sm text-stone-600">
        Картинка
        <div className="mt-1">
          <ImagePicker eventId={eventId} name="imageUrl" value={gift?.imageUrl ?? ""} assets={pickerAssets} adjustable={false} />
        </div>
      </div>
      <label className="block text-sm text-stone-600">
        Что подарить
        <input name="title" required maxLength={160} defaultValue={gift?.title} placeholder="Кофемашина" className={INPUT} />
      </label>
      <label className="block text-sm text-stone-600">
        Уточнения
        <textarea name="description" rows={2} maxLength={1000} defaultValue={gift?.description} placeholder="Модель, цвет, где купить" className={INPUT} />
      </label>
      <label className="block text-sm text-stone-600">
        Ссылка
        <span className="text-stone-400"> — необязательно</span>
        <input name="url" type="url" maxLength={2000} defaultValue={gift?.url} placeholder="https://" className={INPUT} />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input name="reservable" type="checkbox" defaultChecked={gift?.reservable ?? true} className="mt-0.5 size-4 accent-stone-900" />
        <span>
          <span className="text-stone-900">Можно забронировать</span>
          <span className="mt-0.5 block text-stone-500">Гость нажимает «Я подарю это», и подарок занят для остальных. Выключите для того, что можно дарить многим, — например, цветы или сертификаты.</span>
        </span>
      </label>
    </>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <a href={`/app/e/${eventId}/invite?edit=1`} className="mb-2 inline-flex min-h-11 items-center text-sm text-stone-500 hover:text-stone-900">← К редактору приглашения</a>
      <h1 className="mb-1 font-serif text-3xl text-stone-900">Виш-лист</h1>
      <p className="mb-5 max-w-xl text-sm leading-relaxed text-stone-600">Раздел «Виш-лист» есть в каждом шаблоне. Его заголовок и текст правятся прямо в приглашении, а подарки и реквизиты — здесь. Гости отмечают «Я подарю это», и подарок становится занятым для остальных — если у него включена бронь.</p>
      {message ? (
        <p role="status" className="mb-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p>
      ) : null}

      <form action={saveSettings} className="rounded-xl border border-stone-200 bg-card p-5">
        <label className="flex items-start gap-3 text-sm">
          <input name="enabled" type="checkbox" defaultChecked={event.giftsEnabled} className="mt-0.5 size-4 accent-stone-900" />
          <span>
            <span className="font-medium text-stone-900">Показывать виш-лист в приглашении</span>
            <span className="mt-0.5 block text-stone-500">
              Раздел появится в приглашении и на странице гостя.{" "}
              <a href={guestPath} target="_blank" rel="noreferrer" className="underline underline-offset-2">Как это видят гости ↗</a>
            </span>
          </span>
        </label>

        <details className="mt-5 border-t border-stone-100 pt-4">
          <summary className="cursor-pointer text-sm text-stone-600">Деньги в конверте — реквизиты для перевода</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-stone-600">
              Подпись
              <input name="label" required maxLength={120} defaultValue={event.giftTransferLabel} className={INPUT} />
            </label>
            <label className="block text-sm text-stone-600">
              Ссылка на перевод
              <input name="url" type="url" maxLength={2000} defaultValue={event.giftTransferUrl} placeholder="https://" className={INPUT} />
              <span className="mt-1 block text-xs text-stone-500">Из неё гостю рисуется QR-код.</span>
            </label>
            <label className="block text-sm text-stone-600 sm:col-span-2">
              Реквизиты
              <textarea name="details" rows={3} maxLength={2000} defaultValue={event.giftTransferDetails} placeholder="Получатель, банк, номер телефона для СБП" className={INPUT} />
            </label>
          </div>
        </details>

        <div className="mt-4">
          <SubmitButton className={PRIMARY}>Сохранить</SubmitButton>
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">Виш-лист</h2>
        {gifts.length > 0 ? <span className="text-sm text-stone-500">{reservable > 0 ? `выбрано ${taken} из ${reservable}` : `подарков: ${gifts.length}`}</span> : null}
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
                {gift.reservation ? `берёт ${gift.reservation.guest.displayName}` : gift.reservable ? "свободен" : "без брони"}
              </p>
              </div>
            </div>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-stone-500">Изменить</summary>
              <form action={save} className="mt-3 space-y-3">
                {giftFields(gift)}
                <SubmitButton className={PRIMARY}>Сохранить</SubmitButton>
              </form>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-stone-100 pt-3">
                {gift.reservation ? (
                  <form action={release}>
                    <input type="hidden" name="id" value={gift.id} />
                    <ConfirmButton confirmText={`Снять бронь гостя ${gift.reservation.guest.displayName}? Подарок снова станет свободным.`} className="text-stone-600 underline underline-offset-2">
                      Снять бронь
                    </ConfirmButton>
                  </form>
                ) : null}
                <form action={remove}>
                  <input type="hidden" name="id" value={gift.id} />
                  <ConfirmButton confirmText={`Удалить «${gift.title}» из списка?`} className="text-red-700 underline underline-offset-2">
                    Удалить
                  </ConfirmButton>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>

      {gifts.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">Виш-лист пуст. Добавьте, что паре хотелось бы получить: картинку, название и ссылку.</p>
      ) : null}

      <form action={save} className="mt-4 space-y-3 rounded-xl border border-dashed border-stone-300 p-4">
        {giftFields()}
        <SubmitButton className={SECONDARY} pendingText="Добавляем…">Добавить в виш-лист</SubmitButton>
      </form>
    </main>
  );
}
