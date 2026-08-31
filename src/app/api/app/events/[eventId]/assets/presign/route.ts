/**
 * Ссылка на загрузку картинки организатором.
 *
 * Маршрут, а не серверное действие: файл уходит прямо в хранилище, минуя
 * наш сервер, и браузеру нужен адрес до начала отправки.
 */
import { requireEventContext } from "@/server/context";
import { startAssetUpload } from "@/server/services/assets";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);

  const body = (await request.json().catch(() => null)) as
    | { contentType?: string; bytes?: number }
    | null;

  const result = await startAssetUpload(
    ctx,
    String(body?.contentType ?? ""),
    Number(body?.bytes ?? 0),
  );

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
