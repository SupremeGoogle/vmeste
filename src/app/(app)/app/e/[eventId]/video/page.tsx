/**
 * «Видео» — не генератор, а связь с нами: ролик для свадьбы делаем вручную
 * по запросу пары. Автоматическая генерация (face swap через внешние
 * сервисы) убрана из продукта целиком — дорого, медленно и непредсказуемо.
 */
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";

export const dynamic = "force-dynamic";

const TELEGRAM = "https://t.me/supremeHn";

type Props = { params: Promise<{ eventId: string }> };

export default async function VideoPage({ params }: Props) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="rounded-xl border border-stone-200 bg-card px-6 py-10 text-center sm:px-10 sm:py-14">
        <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Видео</p>
        <h2 className="mt-3 font-serif text-2xl sm:text-3xl">Видео для вашей свадьбы</h2>
        <p className="mx-auto mt-3 max-w-md text-stone-600">
          Хотите ролик-приглашение или видео для гостей? Напишите нам в Telegram — обсудим идею и сделаем его для вас.
        </p>
        <a
          href={TELEGRAM}
          target="_blank"
          rel="noopener noreferrer"
          data-rybbit-event="video_contact"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm text-white transition-transform hover:scale-[1.02]"
        >
          Написать в Telegram
          <span aria-hidden="true">↗</span>
        </a>
        <p className="mt-3 text-sm text-stone-500">@supremeHn</p>
      </section>
    </main>
  );
}
