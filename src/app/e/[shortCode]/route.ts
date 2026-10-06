/**
 * Вход по QR-коду. Адрес напечатан на табличках, поэтому он остаётся
 * прежним, а сама страница гостя живёт на `/g/<код>`: поиск себя с
 * выпадающим списком, стол, фото, пожелания и рассадка всех гостей.
 *
 * Здесь — только перенаправление, без запроса к БД: самая горячая точка
 * сценария (150 гостей за 10 минут) не должна ждать базу.
 */
export const dynamic = "force-static";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const code = encodeURIComponent(shortCode.slice(0, 12));
  return new Response(null, {
    status: 307,
    headers: { location: `/g/${code}`, "cache-control": "public, max-age=300" },
  });
}
