/**
 * Подтверждение загрузки: строка в базе появляется только теперь, и
 * только после того, как хранилище подтвердило, что файл на месте.
 */
import { requireEventContext } from "@/server/context";
import { completeAssetUpload } from "@/server/services/assets";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);

  const body = (await request.json().catch(() => null)) as
    | { key?: string; alt?: string }
    | null;

  const result = await completeAssetUpload(ctx, String(body?.key ?? ""), String(body?.alt ?? ""));
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
