/**
 * Модерация пожеланий.
 *
 * В отличие от фотографий — список, а не карусель: строчку читают
 * взглядом, и десяток пожеланий модератор разбирает быстрее списком,
 * чем по одному. Клавиш здесь нет намеренно: они бы означали клиентский
 * компонент ради работы, которой в сумме на минуту.
 */
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { countWishes, listWishes, moderateWish } from "@/server/services/wishes";
import { getT } from "@/server/i18n";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, [string, string]> = {
  PENDING: ["ждёт", "pending"],
  APPROVED: ["опубликовано", "published"],
  REJECTED: ["отклонено", "rejected"],
};

export default async function WishesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const t = await getT();

  const [counts, wishes] = await Promise.all([countWishes(ctx.eventId), listWishes(ctx.eventId)]);

  async function decide(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const status = String(formData.get("status"));
    if (status !== "APPROVED" && status !== "REJECTED" && status !== "PENDING") return;
    await moderateWish(ctx, String(formData.get("wishId")), status);
    revalidatePath(`/app/e/${eventId}/wishes`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("Ждут проверки", "Awaiting review"), value: counts.pending },
          { label: t("Опубликовано", "Published"), value: counts.approved },
          { label: t("Отклонено", "Rejected"), value: counts.rejected },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-stone-200 bg-card p-4">
            <p className="tile-value text-2xl">{tile.value}</p>
            <p className="text-sm text-stone-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {wishes.map((wish) => (
          <li key={wish.id} className="rounded-xl border border-stone-200 bg-card p-4">
            <p className="whitespace-pre-line">{wish.text}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-stone-500">
                {wish.authorName}
                {wish.guest && wish.guest.displayName !== wish.authorName ? (
                  <span className="text-stone-400"> · {t("в списке", "on the list as")}: {wish.guest.displayName}</span>
                ) : null}
                <span className="ml-2 text-xs text-stone-400">{STATUS_LABEL[wish.status] ? t(...STATUS_LABEL[wish.status]) : null}</span>
              </span>
              <div className="flex gap-2">
                {wish.status !== "APPROVED" ? (
                  <form action={decide}>
                    <input type="hidden" name="wishId" value={wish.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button className="rounded-lg bg-stone-900 px-4 py-2 text-xs text-white">
                      {t("Опубликовать", "Publish")}
                    </button>
                  </form>
                ) : null}
                {wish.status !== "REJECTED" ? (
                  <form action={decide}>
                    <input type="hidden" name="wishId" value={wish.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button className="rounded-lg border border-stone-300 px-4 py-2 text-xs">
                      {t("Отклонить", "Reject")}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {wishes.length === 0 ? (
        <p className="mt-8 text-stone-600">
          {t("Пожеланий пока нет. Гости пишут их по ссылке из приглашения.", "No wishes yet. Guests leave them using the link in the invitation.")}
        </p>
      ) : null}
    </main>
  );
}
