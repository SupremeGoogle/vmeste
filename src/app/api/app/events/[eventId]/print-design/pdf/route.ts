import { renderToBuffer } from "@react-pdf/renderer";
import { busyResponse, ServerBusyError, withHeavySlot } from "@/server/heavy";
import { rateLimit } from "@/server/rate-limit";
import QRCode from "qrcode";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { listTables } from "@/server/repositories/seating";
import { printableTables, printDesignSchema } from "@/lib/print-design";
import { PrintDesignDocument } from "@/server/services/pdf/print-design-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  // PDF — самая тяжёлая работа сервиса: не чаще 6 в минуту на организацию
  // и строго по одному на весь сервер (server/heavy.ts).
  if (!rateLimit(`pdf:${ctx.orgId}`, 6, 60_000).ok) return new Response("Слишком часто — подождите минуту", { status: 429 });
  const design = printDesignSchema.safeParse(await request.json().catch(() => null));
  if (!design.success) return new Response("Проверьте макет", { status: 400 });
  const [event, rawTables] = await Promise.all([getEvent(ctx, eventId), listTables(ctx)]);
  if (!event) return new Response("Не найдено", { status: 404 });
  const tables = printableTables(rawTables);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const qrData = await QRCode.toDataURL(`${base}/e/${event.shortCode}`, { width: 900, margin: 1, errorCorrectionLevel: "H" });
  let pdf: Buffer;
  try {
    pdf = await withHeavySlot("pdf", () => renderToBuffer(PrintDesignDocument({ design: design.data, tables, qrData, shortCode: event.shortCode, title: event.title })));
  } catch (error) {
    if (error instanceof ServerBusyError) return busyResponse();
    throw error;
  }
  const name = design.data.mode === "qr" ? "qr-code" : "seating-chart";
  return new Response(new Uint8Array(pdf), { headers: {
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${name}.pdf"`,
    "cache-control": "no-store",
  } });
}
