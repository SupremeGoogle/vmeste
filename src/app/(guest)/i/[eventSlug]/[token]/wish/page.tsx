/**
 * Пожелание молодожёнам.
 *
 * Обычная форма с Server Action: гость пишет её с телефона, часто прямо
 * за столом, и никакого JavaScript для этого не нужно. Имя подставлено
 * из карточки, но его можно поправить — подписываются по-разному.
 */
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { createWish, listGuestWishes } from "@/server/services/wishes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "ждёт проверки",
  APPROVED: "показано в зале",
  REJECTED: "не подошло",
};

type Props = {
  params: Promise<{ eventSlug: string; token: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
};

export default async function WishPage({ params, searchParams }: Props) {
  const { eventSlug, token } = await params;
  const { ok, error } = await searchParams;

  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") notFound();

  const mine = await listGuestWishes({ eventId: guest.eventId, guestId: guest.id });

  async function submit(formData: FormData) {
    "use server";
    const current = await findGuestByLinkToken(token);
    if (!current) notFound();

    const result = await createWish(
      { orgId: current.orgId, eventId: current.eventId, guestId: current.id },
      {
        authorName: String(formData.get("authorName") ?? ""),
        text: String(formData.get("text") ?? ""),
      },
    );

    redirect(
      result.ok
        ? `/i/${eventSlug}/${token}/wish?ok=1`
        : `/i/${eventSlug}/${token}/wish?error=${encodeURIComponent(result.message)}`,
    );
  }

  return (
    <main className="mx-auto max-w-lg bg-white px-6 py-10 shadow-sm">
      <h1 className="text-center text-2xl">Пожелание молодожёнам</h1>
      <p className="mt-2 text-center text-sm text-stone-500">
        {guest.event.title}
      </p>

      {ok ? (
        <p className="mt-6 rounded-lg bg-stone-900 px-4 py-3 text-center text-sm text-white">
          Спасибо! Покажем на экране после проверки.
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {guest.event.wishesEnabled ? (
        <form action={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm text-stone-500">Как подписать</span>
            <input
              name="authorName" required maxLength={80} defaultValue={guest.displayName}
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-500">Пожелание</span>
            <textarea
              name="text" required minLength={3} maxLength={500} rows={5}
              placeholder="Несколько слов — их прочитают в зале"
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"
            />
          </label>
          <button className="w-full rounded-full bg-stone-900 px-8 py-4 text-white">
            Отправить
          </button>
        </form>
      ) : (
        <p className="mt-8 rounded-lg bg-stone-100 px-4 py-3 text-center text-sm text-stone-600">
          Приём пожеланий закрыт организатором.
        </p>
      )}

      {mine.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm text-stone-500">Ваши пожелания</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((wish) => (
              <li key={wish.id} className="rounded-xl border border-stone-200 px-4 py-3 text-sm">
                <p className="whitespace-pre-line">{wish.text}</p>
                <p className="mt-1 text-xs text-stone-500">{STATUS_LABEL[wish.status]}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-center">
        <a href={`/i/${eventSlug}/${token}`} className="text-sm text-stone-500 underline">
          Вернуться к приглашению
        </a>
      </p>
    </main>
  );
}
