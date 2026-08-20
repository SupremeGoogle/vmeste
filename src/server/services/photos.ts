/**
 * Фотографии гостей: загрузка, лимит, модерация.
 *
 * Загрузка идёт **мимо нашего сервера**: браузер получает подписанную ссылку
 * и кладёт файл прямо в хранилище. Иначе кадр на 8 МБ прошёл бы через Node
 * дважды (приём и запись), а таких кадров в один вечер — сотни.
 *
 * Отсюда главное следствие: **между «выдали ссылку» и «файл лежит» нет
 * ничего надёжного**. Гость может закрыть вкладку, потерять связь в лифте,
 * получить отказ хранилища. Поэтому строка в БД создаётся не при выдаче
 * ссылки, а только при подтверждении, и подтверждение перепроверяет, что
 * объект действительно на месте и нужного размера (`HeadObject`).
 * Файл без строки в БД — мусор, который никто не увидит; строка без файла
 * была бы дырой в галерее.
 */
import { db } from "@/server/db";
import {
  ALLOWED_TYPES, MAX_THUMB_BYTES, MAX_UPLOAD_BYTES,
  deleteObjects, headObject, keyBelongsToEvent, photoKeys, presignUpload,
} from "@/server/storage/s3";

export type GuestRef = { orgId: string; eventId: string; guestId: string };

export type UploadTicket = {
  storageKey: string;
  thumbKey: string;
  uploadUrl: string;
  thumbUploadUrl: string;
};

export type StartResult =
  | { ok: true; ticket: UploadTicket; left: number }
  | { ok: false; reason: "limit" | "type" | "size" | "disabled"; message: string };

/** Сколько фото уже принято у гостя и сколько ему осталось. */
export async function guestQuota(guest: GuestRef) {
  const [used, event] = await Promise.all([
    db.photo.count({
      where: { eventId: guest.eventId, guestId: guest.guestId, status: { not: "REJECTED" } },
    }),
    db.event.findFirst({
      where: { id: guest.eventId, orgId: guest.orgId },
      select: { photoLimitPerGuest: true, photosEnabled: true },
    }),
  ]);

  const limit = event?.photoLimitPerGuest ?? 5;
  return { used, limit, left: Math.max(0, limit - used), enabled: event?.photosEnabled ?? false };
}

/**
 * Выдать ссылки на загрузку одного фото.
 *
 * Отклонённые фото в лимит не входят: гость, которому отклонили размытый
 * кадр, должен иметь возможность прислать другой, иначе модерация
 * превращается в наказание.
 */
export async function startUpload(
  guest: GuestRef,
  input: { contentType: string; bytes: number },
): Promise<StartResult> {
  const quota = await guestQuota(guest);
  if (!quota.enabled) {
    return { ok: false, reason: "disabled", message: "Загрузка фотографий закрыта" };
  }
  if (quota.left <= 0) {
    return {
      ok: false,
      reason: "limit",
      message: `Больше ${quota.limit} фотографий не принимаем — выберите лучшие`,
    };
  }
  if (!ALLOWED_TYPES.includes(input.contentType)) {
    return { ok: false, reason: "type", message: "Принимаем только фотографии" };
  }
  if (input.bytes <= 0 || input.bytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: "size",
      message: `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ`,
    };
  }

  const keys = photoKeys(guest.eventId);
  const [uploadUrl, thumbUploadUrl] = await Promise.all([
    presignUpload(keys.storageKey, input.contentType),
    presignUpload(keys.thumbKey, "image/webp"),
  ]);

  return {
    ok: true,
    left: quota.left,
    ticket: { ...keys, uploadUrl, thumbUploadUrl },
  };
}

export type CompleteInput = {
  storageKey: string;
  thumbKey: string;
  width: number;
  height: number;
  previewOk: boolean;
};

export type CompleteResult =
  | { ok: true; photoId: string; left: number }
  | { ok: false; reason: "limit" | "missing" | "size" | "foreign"; message: string };

/**
 * Подтверждение загрузки: строка в БД появляется здесь.
 *
 * Ключи приходят от клиента, поэтому проверяется всё, что можно проверить:
 * принадлежат ли они этому мероприятию (чужой префикс — попытка приписать
 * себе чужой файл), лежит ли объект на месте и не больше ли он разрешённого.
 * Лимит проверяется второй раз: между выдачей ссылки и подтверждением
 * гость мог загрузить в двух вкладках сразу.
 */
export async function completeUpload(
  guest: GuestRef,
  input: CompleteInput,
): Promise<CompleteResult> {
  if (
    !keyBelongsToEvent(input.storageKey, guest.eventId) ||
    !keyBelongsToEvent(input.thumbKey, guest.eventId)
  ) {
    return { ok: false, reason: "foreign", message: "Файл не от этого мероприятия" };
  }

  const quota = await guestQuota(guest);
  if (quota.left <= 0) {
    // Файл уже лежит в бакете, но принять его нельзя — убираем за собой,
    // иначе за вечер накопится мусор, за который платит организатор.
    await deleteObjects([input.storageKey, input.thumbKey]).catch(() => {});
    return { ok: false, reason: "limit", message: "Лимит фотографий исчерпан" };
  }

  let head;
  try {
    head = await headObject(input.storageKey);
  } catch {
    return { ok: false, reason: "missing", message: "Файл не долетел — попробуйте ещё раз" };
  }
  if (head.bytes <= 0 || head.bytes > MAX_UPLOAD_BYTES) {
    await deleteObjects([input.storageKey, input.thumbKey]).catch(() => {});
    return { ok: false, reason: "size", message: "Файл слишком большой" };
  }

  // Превью необязательно: если браузер не смог его сделать, фото всё равно
  // принимаем (PLAN.md §5.5), просто помечаем.
  let previewOk = input.previewOk;
  if (previewOk) {
    try {
      const thumb = await headObject(input.thumbKey);
      if (thumb.bytes <= 0 || thumb.bytes > MAX_THUMB_BYTES) previewOk = false;
    } catch {
      previewOk = false;
    }
  }

  const photo = await db.photo.create({
    data: {
      orgId: guest.orgId,
      eventId: guest.eventId,
      guestId: guest.guestId,
      storageKey: input.storageKey,
      thumbKey: input.thumbKey,
      width: Math.max(0, Math.trunc(input.width)),
      height: Math.max(0, Math.trunc(input.height)),
      bytes: head.bytes,
      previewOk,
      status: "PENDING",
    },
  });

  return { ok: true, photoId: photo.id, left: quota.left - 1 };
}

/** Фото гостя — он видит свои в любом статусе, включая ожидающие. */
export async function listGuestPhotos(guest: GuestRef) {
  return db.photo.findMany({
    where: { eventId: guest.eventId, guestId: guest.guestId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, previewOk: true, createdAt: true },
  });
}

/** Одобренные фото мероприятия — галерея и (с этапа 6) экран в зале. */
export async function listApprovedPhotos(eventId: string, limit = 60) {
  return db.photo.findMany({
    where: { eventId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, previewOk: true, width: true, height: true, createdAt: true,
      guest: { select: { displayName: true } },
    },
  });
}

export async function listPendingPhotos(eventId: string, limit = 100) {
  return db.photo.findMany({
    where: { eventId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true, previewOk: true, width: true, height: true, bytes: true, createdAt: true,
      guest: { select: { displayName: true } },
    },
  });
}

export async function countPhotos(eventId: string) {
  const rows = await db.photo.groupBy({
    by: ["status"],
    where: { eventId },
    _count: { _all: true },
  });
  const count = (status: string) => rows.find((row) => row.status === status)?._count._all ?? 0;
  return {
    pending: count("PENDING"),
    approved: count("APPROVED"),
    rejected: count("REJECTED"),
  };
}

/**
 * Решение модератора. Возвращает false, если фото не найдено в этом
 * мероприятии, — чужой `photoId` из адресной строки ничего не делает.
 */
export async function moderatePhoto(
  ctx: { orgId: string; eventId: string; userId: string },
  photoId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
): Promise<boolean> {
  const updated = await db.photo.updateMany({
    where: { id: photoId, eventId: ctx.eventId },
    data: {
      status,
      moderatedAt: status === "PENDING" ? null : new Date(),
      moderatedBy: status === "PENDING" ? null : ctx.userId,
    },
  });
  return updated.count === 1;
}

/**
 * Удаление фото организатором — вместе с файлами.
 *
 * Отклонение оставляет файл в хранилище: решение можно передумать, а место
 * стоит копейки. Удаление — окончательное, для случая «гость прислал не то
 * и просит убрать»: сначала уходит строка, потом объекты. Порядок важен —
 * если удаление объектов упадёт, в галерее не останется битой карточки.
 */
export async function deletePhoto(
  ctx: { orgId: string; eventId: string },
  photoId: string,
): Promise<boolean> {
  const photo = await db.photo.findFirst({
    where: { id: photoId, eventId: ctx.eventId },
    select: { id: true, storageKey: true, thumbKey: true },
  });
  if (!photo) return false;

  await db.photo.deleteMany({ where: { id: photo.id, eventId: ctx.eventId } });
  await deleteObjects([photo.storageKey, photo.thumbKey]).catch(() => {});
  return true;
}
