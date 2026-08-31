/**
 * Отдача картинки, загруженной организатором.
 *
 * Правила проще, чем у гостевых фотографий: обложка приглашения по
 * определению публична — её видит каждый, кто открыл ссылку. Поэтому
 * проверяется только принадлежность мероприятию, а не личность
 * смотрящего.
 *
 * Мероприятие стоит в адресе не для красоты: без него запрос был бы
 * поиском по одному `id`, а это запрещает страж мультиарендности
 * (`server/db.ts`).
 */
import { db } from "@/server/db";
import { getObject } from "@/server/storage/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; assetId: string }> },
) {
  const { eventId, assetId } = await params;

  const asset = await db.eventAsset.findFirst({
    where: { id: assetId, eventId },
    select: { storageKey: true, contentType: true },
  });
  if (!asset) return new Response("Не найдено", { status: 404 });

  // Строка в базе есть, а файла нет — так бывает, если хранилище
  // подменили или чистили руками. Для гостя это то же «не найдено»:
  // пустой ответ 200 браузер показал бы битой картинкой.
  const object = await getObject(asset.storageKey).catch(() => null);
  if (!object) return new Response("Не найдено", { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": asset.contentType || object.contentType,
      // Картинка неизменяемая: новый файл получает новый id, поэтому
      // кешировать можно надолго и без оглядки.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
