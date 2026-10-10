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
import { makeT, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Заголовок вкладки — на языке мероприятия, как и вся страница. */
export async function generateMetadata({ params }: { params: Promise<{ shortCode: string }> }): Promise<Metadata> {
  const event = await findEventByShortCode((await params).shortCode);
  return { title: event?.language === "en" ? "Wishlist" : "Виш-лист" };
}

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
  const lang = parseLang(event.language) ?? "ru";
  const t = makeT(lang);

  const back = (
    <Link href={`/g/${event.shortCode}`} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-muted hover:text-ink">
      {t("← Моя страница", "← My page")}
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
        <p className="guest-card mt-6 p-6 text-center text-[15px] text-muted">{t("Виш-лист пока закрыт.", "The wishlist is closed for now.")}</p>
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
        <h1 className="font-serif text-[34px] leading-tight sm:text-4xl">{t("Наш виш-лист", "Our wishlist")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
          {gifts.length > 0
            ? gifts.some((gift) => gift.reservable)
              ? t("Отметьте, что хотите подарить, — у других гостей этот подарок станет занятым.", "Mark what you’d like to give — other guests will see it as taken.")
              : t("Идеи подарков от пары — выбирайте любой.", "Gift ideas from the couple — pick any you like.")
            : hasEnvelope
              ? t("Поздравить можно переводом — реквизиты ниже.", "You can send a gift by bank transfer — details below.")
              : t("Пара пока ничего сюда не добавила.", "The couple hasn’t added anything yet.")}
        </p>
      </header>

      {message ? (
        <p role="status" className="mt-5 rounded-2xl border border-line bg-card px-4 py-3 text-center text-[15px]">{message}</p>
      ) : null}

      {gifts.length > 0 ? (
        <ul className="mt-6 space-y-3" aria-label={t("Виш-лист", "Wishlist")}>
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
                  {mine ? <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-xs text-gold">{t("ваш", "yours")}</span> : null}
                  {taken ? <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-muted">{t("уже выбрали", "taken")}</span> : null}
                </div>
                {gift.description ? <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-muted">{gift.description}</p> : null}
                {gift.url ? (
                  <a href={gift.url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex min-h-11 items-center text-[15px] underline decoration-line underline-offset-4">
                    {t("Где посмотреть ↗", "Where to find it ↗")}
                  </a>
                ) : null}
                {!gift.reservable && !mine && !taken ? (
                  <p className="mt-3 text-[15px] text-muted">{t("Без брони — этот подарок может сделать любой гость.", "No reservation needed — any guest can give this.")}</p>
                ) : !taken && myGift && !mine ? (
                  <p className="mt-3 text-[15px] text-muted">{t(`Вы уже выбрали «${myGift.title}».`, `You’ve already chosen “${myGift.title}”.`)}</p>
                ) : !taken ? (
                  <form action={choose} className="mt-3">
                    <input type="hidden" name="giftId" value={gift.id} />
                    <input type="hidden" name="release" value={mine ? "1" : "0"} />
                    <SubmitButton
                      pendingText={t("Минуту…", "One moment…")}
                      className={
                        mine
                          ? "min-h-12 w-full rounded-2xl border border-line bg-card text-[15px] text-muted"
                          : "min-h-12 w-full rounded-2xl border border-gold-soft bg-card text-[16px] font-medium text-gold transition-colors active:bg-paper"
                      }
                    >
                      {mine ? t("Снять мою бронь", "Cancel my reservation") : t("Я подарю это", "I’ll give this")}
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
          <h2 className="font-serif text-[26px] leading-tight">
            {/* Подпись по умолчанию заведена по-русски; своё название организатора не трогаем. */}
            {lang === "en" && settings.giftTransferLabel === "Подарок в конверте" ? "Cash gift" : settings.giftTransferLabel}
          </h2>
          {settings.giftTransferDetails ? (
            <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-muted">{settings.giftTransferDetails}</p>
          ) : null}
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- QR собран на сервере, data: URL */}
              <img src={qr} width={220} height={220} alt={t("QR-код для перевода", "QR code for the transfer")} className="mx-auto mt-5 rounded-xl border border-line bg-white p-2" />
              <a href={settings.giftTransferUrl} target="_blank" rel="noreferrer noopener" className="guest-button mt-5 flex min-h-12 items-center justify-center rounded-2xl text-[16px] font-medium">
                {t("Перевести", "Send a gift")}
              </a>
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
