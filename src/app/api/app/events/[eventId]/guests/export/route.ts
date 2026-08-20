/**
 * Выгрузка списка гостей с ответами. Одна таблица, которую координатор
 * отдаёт площадке: кто придёт, что ест, где сидит.
 *
 * Route handler, а не Server Action: результат — файл, а не переход.
 */
import { requireEventContext } from "@/server/context";
import { db } from "@/server/db";
import { csvHeaders, toCsv } from "@/server/services/csv-export";

export const dynamic = "force-dynamic";

const RSVP: Record<string, string> = {
  PENDING: "не ответил",
  ACCEPTED: "придёт",
  DECLINED: "не придёт",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  // Чужой eventId даёт 404 внутри requireEventContext — до базы дело не дойдёт.
  const ctx = await requireEventContext(eventId);

  const guests = await db.guest.findMany({
    where: { eventId: ctx.eventId, archivedAt: null },
    orderBy: { searchKey: "asc" },
    select: {
      displayName: true, phone: true, email: true, rsvpStatus: true, rsvpAt: true,
      allergies: true, comment: true, note: true, linkToken: true, linkOpenedAt: true,
      parentGuestId: true,
      mealOption: { select: { title: true } },
      parentGuest: { select: { displayName: true } },
      seat: { select: { index: true, table: { select: { label: true } } } },
    },
  });

  const origin = new URL(request.url).origin;
  const event = await db.event.findFirst({
    where: { id: ctx.eventId, orgId: ctx.orgId },
    select: { slug: true },
  });

  const csv = toCsv(
    [
      "Гость", "Ответ", "Когда ответил", "Блюдо", "Аллергии",
      "Комментарий", "Спутник кого", "Стол", "Место", "Телефон", "Почта",
      "Заметка", "Ссылка открыта", "Именная ссылка",
    ],
    guests.map((guest) => [
      guest.displayName,
      RSVP[guest.rsvpStatus],
      guest.rsvpAt ? guest.rsvpAt.toISOString().slice(0, 16).replace("T", " ") : "",
      guest.mealOption?.title ?? "",
      guest.allergies ?? "",
      guest.comment ?? "",
      guest.parentGuest?.displayName ?? "",
      guest.seat?.table.label ?? "",
      guest.seat ? guest.seat.index + 1 : "",
      guest.phone ?? "",
      guest.email ?? "",
      guest.note ?? "",
      guest.linkOpenedAt ? "да" : "нет",
      event ? `${origin}/i/${event.slug}/${guest.linkToken}` : "",
    ]),
  );

  return new Response(csv, { headers: csvHeaders("guests") });
}
