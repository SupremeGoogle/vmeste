/**
 * Приглашение без персонализации: ссылка для соцсетей, чата и превью.
 *
 * Отдаётся из кеша с ревалидацией по тегу (PLAN.md §2.5): в день свадьбы
 * блоки не меняются, а страницу открывают сотни раз с плохой связи.
 * Формы ответа здесь нет — отвечать может только гость с именной ссылкой,
 * иначе в списке появятся ответы неизвестно от кого.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInviteBySlug } from "@/server/repositories/invites";
import { InviteBlocks } from "@/components/invite/blocks";
import { formatEventDateTime } from "@/lib/format-datetime";

export const revalidate = 60;

/**
 * Пустой список параметров при сборке — но объявление обязательно: без него
 * Next считает маршрут с динамическим сегментом рендером на запрос и отдаёт
 * `no-store`, то есть ни браузер, ни CDN приглашение не кешируют. С ним
 * первый заход генерирует страницу, а остальные идут из кеша (ISR),
 * ради чего этот маршрут и заведён отдельно от именного (PLAN.md §2.5).
 * Мероприятий в базе к моменту сборки может не быть вовсе, поэтому список
 * пустой, а не выбранный из БД.
 */
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ eventSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventSlug } = await params;
  const invite = await getInviteBySlug(eventSlug);
  if (!invite) return { title: "Приглашение" };
  return {
    title: invite.event.title,
    description: formatEventDateTime(invite.event.eventDate, invite.event.timezone),
  };
}

export default async function PublicInvitePage({ params }: Props) {
  const { eventSlug } = await params;
  const invite = await getInviteBySlug(eventSlug);
  if (!invite) notFound();

  return (
    <main className="mx-auto max-w-2xl bg-white pb-16 shadow-sm">
      <InviteBlocks blocks={invite.blocks} rsvpHref={null} answered={null} />
      <footer className="px-6 pb-10 text-center text-sm text-stone-400">
        {formatEventDateTime(invite.event.eventDate, invite.event.timezone)}
      </footer>
    </main>
  );
}
