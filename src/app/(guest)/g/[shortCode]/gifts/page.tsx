/**
 * Виш-лист для гостя: картинки, ссылки, бронь «я подарю это» и конверт.
 *
 * Кто взял подарок, другим гостям не показываем — только что он занят.
 * QR рисуется на сервере из ссылки на перевод: на телефоне гость нажмёт
 * кнопку, а с компьютера отсканирует код телефоном.
 */
import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { findEventByShortCode } from "@/server/repositories/events";
import { identifyByEventSession } from "@/server/guest-access/identify";
import { reserveGift } from "@/server/services/gifts";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Виш-лист" };

type Props = {
  params: Promise<{ shortCode: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function GuestGiftsPage({ params, searchParams }: Props) {
  const { shortCode } = await params;
  const { message } = await searchParams;
  const event = await findEventByShortCode(shortCode);
  if (!event) notFound();
  const guest = await identifyByEventSession(event.id);
  if (!guest) redirect(`/g/${event.shortCode}`);

  const back = (
    <Link href={`/g/${event.shortCode}`} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-muted hover:text-ink">
      ← Моя страница
    </Link>
  );

  const settings = await db.event.findFirst({
    where: { id: event.id, orgId: guest.orgId, giftsEnabled: true },
    select: { giftTransferLabel: true, giftTransferDetails: true, giftTransferUrl: true },
  });
  if (!settings) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-16 sm:pt-8">
        {back}
        <p className="guest-card mt-6 p-6 text-center text-[15px] text-muted">Виш-лист пока закрыт.</p>
      </main>
    );
  }

  const gifts = await db.gift.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
    include: { reservation: { select: { guestId: true } } },
  });
  const qr = settings.giftTransferUrl ? await QRCode.toDataURL(settings.giftTransferUrl, { width: 220, margin: 1 }) : null;
  const hasEnvelope = Boolean(settings.giftTransferDetails || settings.giftTransferUrl);
  // Гостю положен один подарок (GIFTS_PER_GUEST): выбрав его, он видит
  // на остальных пояснение, а не кнопку, которая всё равно откажет.
  const myGift = gifts.find((gift) => gift.reservation?.guestId === guest.guestId);

  async function choose(data: FormData) {
    "use server";
    const event = await findEventByShortCode(shortCode);
    if (!event) notFound();
    const guest = await identifyByEventSession(event.id);
    if (!guest) redirect(`/g/${event.shortCode}`);
    const result = await reserveGift(guest, String(data.get("giftId") ?? ""), data.get("release") === "1");
    const path = `/g/${event.shortCode}/gifts`;
    revalidatePath(path);
    revalidatePath(`/app/e/${event.id}/invite/wishlist`);
    redirect(`${path}?message=${encodeURIComponent(result.message)}`);
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-16 sm:pt-8">
      {back}

      <header className="mt-4 text-center">
        <h1 className="font-serif text-[34px] leading-tight sm:text-4xl">Наш виш-лист</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
          {gifts.length > 0
            ? "Отметьте, что хотите подарить, — у других гостей этот подарок станет занятым."
            : hasEnvelope
              ? "Поздравить можно переводом — реквизиты ниже."
              : "Пара пока ничего сюда не добавила."}
        </p>
      </header>

      {message ? (
        <p role="status" className="mt-5 rounded-2xl border border-line bg-card px-4 py-3 text-center text-[15px]">{message}</p>
      ) : null}

      {gifts.length > 0 ? (
        <ul className="mt-6 space-y-3" aria-label="Виш-лист">
          {gifts.map((gift) => {
            const mine = gift.reservation?.guestId === guest.guestId;
            const taken = Boolean(gift.reservation) && !mine;
            return (
              <li key={gift.id} className={`guest-card overflow-hidden ${taken ? "opacity-60" : ""}`}>
                {gift.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- картинка из закрытого хранилища, размер заранее неизвестен.
                  <img src={gift.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : null}
                <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-[24px] leading-tight">{gift.title}</h2>
                  {mine ? <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-xs text-gold">ваш</span> : null}
                  {taken ? <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-muted">уже выбрали</span> : null}
                </div>
                {gift.description ? <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-muted">{gift.description}</p> : null}
                {gift.url ? (
                  <a href={gift.url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex min-h-11 items-center text-[15px] underline decoration-line underline-offset-4">
                    Где посмотреть ↗
                  </a>
                ) : null}
                {!taken && myGift && !mine ? (
                  <p className="mt-3 text-[15px] text-muted">Вы уже выбрали «{myGift.title}».</p>
                ) : !taken ? (
                  <form action={choose} className="mt-3">
                    <input type="hidden" name="giftId" value={gift.id} />
                    <input type="hidden" name="release" value={mine ? "1" : "0"} />
                    <SubmitButton
                      pendingText="Минуту…"
                      className={
                        mine
                          ? "min-h-12 w-full rounded-2xl border border-line bg-card text-[15px] text-muted"
                          : "min-h-12 w-full rounded-2xl border border-gold-soft bg-card text-[16px] font-medium text-gold transition-colors active:bg-paper"
                      }
                    >
                      {mine ? "Снять мою бронь" : "Я подарю это"}
                    </SubmitButton>
                  </form>
                ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hasEnvelope ? (
        <section className="guest-card mt-6 p-6 text-center">
          <h2 className="font-serif text-[26px] leading-tight">{settings.giftTransferLabel}</h2>
          {settings.giftTransferDetails ? (
            <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-muted">{settings.giftTransferDetails}</p>
          ) : null}
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- QR собран на сервере, data: URL */}
              <img src={qr} width={220} height={220} alt="QR-код для перевода" className="mx-auto mt-5 rounded-xl border border-line bg-white p-2" />
              <a href={settings.giftTransferUrl} target="_blank" rel="noreferrer noopener" className="guest-button mt-5 flex min-h-12 items-center justify-center rounded-2xl text-[16px] font-medium">
                Перевести
              </a>
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
