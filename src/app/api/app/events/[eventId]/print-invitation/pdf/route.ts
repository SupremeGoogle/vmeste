import { renderToBuffer } from "@react-pdf/renderer";
import { busyResponse, ServerBusyError, withHeavySlot } from "@/server/heavy";
import { rateLimit } from "@/server/rate-limit";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { listGuests } from "@/server/repositories/guests";
import { printInvitationSchema } from "@/lib/print-invitation";
import { PrintInvitationDocument } from "@/server/services/pdf/print-invitation-pdf";
import { loadPrintInvitationPhotos } from "@/server/services/print-invitation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  // PDF — самая тяжёлая работа сервиса: не чаще 6 в минуту на организацию
  // и строго по одному на весь сервер (server/heavy.ts).
  if (!rateLimit(`pdf:${ctx.orgId}`, 6, 60_000).ok) return new Response("Слишком часто — подождите минуту", { status: 429 });
  const design = printInvitationSchema.safeParse(await request.json().catch(() => null));
  if (!design.success) return new Response("Проверьте макет приглашения", { status: 400 });
  const event = await getEvent(ctx, eventId);
  if (!event) return new Response("Мероприятие не найдено", { status: 404 });
  const guests = design.data.recipients === "all"
    ? (await listGuests(ctx)).filter((guest) => !guest.parentGuestId).map((guest) => guest.displayName)
    : [];
  if (design.data.recipients === "all" && !guests.length) return new Response("Сначала добавьте гостей", { status: 400 });
  if (guests.length > 150) return new Response("Для одного PDF можно выбрать не больше 150 гостей", { status: 400 });
  const photos = await loadPrintInvitationPhotos(ctx, design.data).catch(() => null);
  if (!photos) return new Response("Одна из фотографий недоступна. Замените её в макете.", { status: 422 });
  let pdf: Buffer;
  try {
    pdf = await withHeavySlot("pdf", () => renderToBuffer(PrintInvitationDocument({ design: design.data, guests, photos })));
  } catch (error) {
    if (error instanceof ServerBusyError) return busyResponse();
    throw error;
  }
  const name = design.data.recipients === "all" ? "wedding-invitations-guests" : "wedding-invitation";
  return new Response(new Uint8Array(pdf), { headers: {
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${name}.pdf"`,
    "cache-control": "no-store",
  } });
}
