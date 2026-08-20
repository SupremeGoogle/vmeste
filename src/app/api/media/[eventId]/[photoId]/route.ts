/**
 * Отдача фотографии. Единственный путь к файлу: бакет закрыт целиком
 * (PLAN.md §4.5).
 *
 * Правила доступа:
 *   — одобренное фото видит любой, у кого есть ссылка: оно и так уже
 *     показано в галерее и на экране в зале;
 *   — своё фото в любом статусе видит его автор по гостевой cookie:
 *     иначе он не поймёт, дошло ли оно;
 *   — всё остальное — только организатор этого мероприятия.
 *
 * Файл отдаётся потоком через приложение, а не presigned-ссылкой на
 * хранилище. Подписанная ссылка живёт часами и переживает отклонение фото:
 * «убрали с экрана» превратилось бы в «убрали, но по старой ссылке видно».
 *
 * Мероприятие стоит в адресе не для красоты: без него запрос к фото был бы
 * поиском по одному `id`, а это ровно то, что запрещает страж
 * мультиарендности (`server/db.ts`). Заводить для медиа исключение из
 * правила — плохой размен: адрес и так формирует наша же страница.
 */
import { db } from "@/server/db";
import { getObject } from "@/server/storage/s3";
import { identifyBySession } from "@/server/guest-access/identify";
import { getOrgContext } from "@/server/context";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> },
) {
  const { eventId, photoId } = await params;
  const size = new URL(request.url).searchParams.get("size") === "full" ? "full" : "thumb";

  const photo = await db.photo.findFirst({
    where: { id: photoId, eventId },
    select: {
      id: true, orgId: true, eventId: true, guestId: true,
      storageKey: true, thumbKey: true, status: true, previewOk: true,
    },
  });
  if (!photo) return new Response(null, { status: 404 });

  if (!(await mayView(photo))) return new Response(null, { status: 404 });

  // Превью может не существовать (телефон не смог его сделать) — тогда
  // отдаём оригинал: пусть тяжелее, но не битая картинка в модерации.
  const key = size === "thumb" && photo.previewOk ? photo.thumbKey : photo.storageKey;
  const object = await getObject(key);
  if (!object) return new Response(null, { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": object.contentType,
      "content-length": String(object.bytes),
      // Приватный кеш: у одобренного фото ссылка стабильна, но общим
      // кешам и CDN раздавать его нельзя — статус может измениться.
      "cache-control": photo.status === "APPROVED" ? "private, max-age=3600" : "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

type PhotoRow = {
  orgId: string;
  eventId: string;
  guestId: string | null;
  status: string;
};

async function mayView(photo: PhotoRow): Promise<boolean> {
  if (photo.status === "APPROVED") return true;

  const guest = await identifyBySession(photo.eventId);
  if (guest && photo.guestId && guest.guestId === photo.guestId) return true;

  const org = await getOrgContext();
  return org?.orgId === photo.orgId;
}
