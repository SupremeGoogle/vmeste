/**
 * Выгрузка плана рассадки в PDF.
 *
 * Отдаётся потоком, а не буфером: документ на 150 гостей — это три страницы,
 * но собирать его целиком в память незачем.
 */
import { renderToStream } from "@react-pdf/renderer";
import { requireEventContext } from "@/server/context";
import { getSeatingPlan } from "@/server/repositories/seating";
import { SeatingDocument } from "@/server/services/pdf/seating-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Имя файла: с датой выгрузки, чтобы на столе координатора не оказалось
 *  двух одинаковых распечаток разной свежести. */
function fileName(title: string, at: Date): string {
  const slug = title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40);
  const stamp = at.toISOString().slice(0, 10);
  return `${slug || "рассадка"}-${stamp}.pdf`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const { event, tables } = await getSeatingPlan(ctx);
  if (!event) return new Response("Не найдено", { status: 404 });

  const generatedAt = new Date();

  const stream = await renderToStream(
    SeatingDocument({
      eventTitle: event.title,
      eventDate: event.eventDate,
      venueName: event.venueName,
      tables,
      generatedAt,
    }),
  );

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        fileName(event.title, generatedAt),
      )}`,
      "cache-control": "no-store",
    },
  });
}
