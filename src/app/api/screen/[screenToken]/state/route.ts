/**
 * Полный снимок состояния для экрана.
 *
 * Берётся при первой загрузке и после долгого разрыва связи. Отсюда же
 * экран узнаёт номер последнего события: с него он продолжит поток, и
 * ничего не потеряется в промежутке между снимком и подпиской.
 */
import { accessByScreenToken, screenSnapshot, touchScreen } from "@/server/services/screen";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ screenToken: string }> },
) {
  const { screenToken } = await params;
  const access = await accessByScreenToken(screenToken);
  if (!access) return new Response(null, { status: 404 });

  await touchScreen(access.tokenId, access.eventId);
  const snapshot = await screenSnapshot(access);

  return Response.json(snapshot, {
    headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}
