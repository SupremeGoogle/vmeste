/**
 * Именное приглашение.
 *
 * Мероприятие определяется по токену, а не по слагу в адресе: слаг уникален
 * внутри организации, и две свадьбы могут оказаться `ivanovy`. Слаг здесь
 * только для читаемости ссылки — если он не совпал с тем, что у мероприятия
 * гостя, это 404, а не «покажем другое».
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findGuestByLinkToken, markLinkOpened } from "@/server/repositories/guests";
import { getInviteBlocks } from "@/server/repositories/invites";
import { InviteBlocks } from "@/components/invite/blocks";
import { formatEventDateTime, formatDeadline } from "@/lib/format-datetime";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventSlug: string; token: string }>;
  searchParams: Promise<{ ok?: string }>;
};

/** Именная страница не должна попадать в поисковую выдачу и превью соцсетей. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ANSWER_LABEL: Record<string, string> = {
  ACCEPTED: "придём",
  DECLINED: "не сможем быть",
};

export default async function PersonalInvitePage({ params, searchParams }: Props) {
  const { eventSlug, token } = await params;
  const { ok } = await searchParams;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") notFound();

  // Отметка «ссылка дошла» — не должна задерживать отрисовку страницы.
  void markLinkOpened(guest.eventId, guest.id).catch(() => {});

  const blocks = await getInviteBlocks(guest.eventId);
  const rsvpHref = `/i/${eventSlug}/${token}/rsvp`;
  const answered = guest.rsvpStatus === "PENDING" ? null : ANSWER_LABEL[guest.rsvpStatus];
  const deadline = guest.event.rsvpDeadline;
  const answeredNote = answered ? `: ${answered}` : "";

  return (
    <main className="mx-auto max-w-2xl bg-white pb-16 shadow-sm">
      {/* После отправки гость возвращается на верх длинной страницы, а его
          ответ показан в самом низу, в блоке формы. Без этой строки
          отправка выглядит как «ничего не произошло» — видно только
          в браузере, тесты такое не ловят. */}
      {ok ? (
        <p className="bg-stone-900 px-6 py-3 text-center text-sm text-white">
          Спасибо, ответ записан{answeredNote}
        </p>
      ) : null}

      <p className="px-6 pt-8 text-center text-sm tracking-widest text-stone-500 uppercase">
        {guest.displayName}
      </p>

      <InviteBlocks blocks={blocks} rsvpHref={rsvpHref} answered={answered} />

      {/* Запасной путь: если организатор не добавил блок с формой,
          гостю всё равно нужно чем-то ответить. */}
      {!blocks.some((block) => block.type === "RSVP_FORM") ? (
        <div className="px-6 pb-8 text-center">
          <a
            href={rsvpHref}
            className="inline-block rounded-full bg-stone-900 px-8 py-3 text-white"
          >
            {answered ? "Изменить ответ" : "Ответить на приглашение"}
          </a>
        </div>
      ) : null}

      <footer className="px-6 pb-10 text-center text-sm text-stone-400">
        {formatEventDateTime(guest.event.eventDate, guest.event.timezone)}
        {deadline ? (
          <span className="mt-1 block">
            Ответ ждём до {formatDeadline(deadline, guest.event.timezone)}
          </span>
        ) : null}
      </footer>
    </main>
  );
}
