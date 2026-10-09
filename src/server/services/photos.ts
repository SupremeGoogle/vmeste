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
 *
 * При подтверждении сервер один раз читает исходник и кладёт на его место
 * WebP до 2560 px плюс превью (`server/images/convert.ts`). Так любой
 * формат — HEIC, AVIF, TIFF, PNG — открывается в любом браузере, кадр
 * весит меньше мегабайта, а координаты из EXIF не уходят в галерею.
 */
import { db } from "@/server/db";
import { makeT, parseLang, type T } from "@/lib/i18n";
import { bus } from "@/server/events/bus";
import { GUEST_PHOTO, convertImage } from "@/server/images/convert";
import { NSFW_FLAG, nsfwScore } from "@/server/images/nsfw";
import {
  ALLOWED_TYPES, MAX_UPLOAD_BYTES,
  deleteObjects, headObject, keyBelongsToEvent, photoKeys, presignUpload, putObject, readObject,
  thumbKeyFor,
} from "@/server/storage/s3";

export type GuestRef = { orgId: string; eventId: string; guestId: string };

export type UploadTicket = {
  storageKey: string;
  uploadUrl: string;
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
      select: { photoLimitPerGuest: true, photosEnabled: true, language: true },
    }),
  ]);

  const limit = event?.photoLimitPerGuest ?? 5;
  return { used, limit, left: Math.max(0, limit - used), enabled: event?.photosEnabled ?? false, language: parseLang(event?.language) ?? "ru" };
}

/** Переводчик на язык мероприятия — для сообщений гостю до подсчёта лимита. */
async function eventT(eventId: string): Promise<T> {
  const event = await db.event.findFirst({ where: { id: eventId }, select: { language: true } });
  return makeT(parseLang(event?.language) ?? "ru");
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
  const t = makeT(quota.language);
  if (!quota.enabled) {
    return { ok: false, reason: "disabled", message: t("Загрузка фотографий закрыта", "Photo uploads are closed") };
  }
  if (quota.left <= 0) {
    return {
      ok: false,
      reason: "limit",
      message: t(`Больше ${quota.limit} фотографий не принимаем — выберите лучшие`, `You can send up to ${quota.limit} photos. Please choose your favorites`),
    };
  }
  if (!ALLOWED_TYPES.includes(input.contentType)) {
    return { ok: false, reason: "type", message: t("Принимаем только фотографии", "Only photos can be uploaded") };
  }
  if (input.bytes <= 0 || input.bytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: "size",
      message: t(`Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ`, `The file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`),
    };
  }

  const { storageKey } = photoKeys(guest.eventId);
  const uploadUrl = await presignUpload(storageKey, input.contentType);

  return { ok: true, left: quota.left, ticket: { storageKey, uploadUrl } };
}

export type CompleteInput = { storageKey: string };

export type CompleteResult =
  | { ok: true; photoId: string; left: number }
  | { ok: false; reason: "limit" | "missing" | "size" | "foreign" | "unreadable" | "duplicate"; message: string };

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
  const thumbKey = thumbKeyFor(input.storageKey);
  if (!thumbKey || !keyBelongsToEvent(input.storageKey, guest.eventId)) {
    return { ok: false, reason: "foreign", message: (await eventT(guest.eventId))("Файл не от этого мероприятия", "This file doesn’t belong to this event") };
  }

  // Повторное подтверждение того же файла (двойной клик, повтор запроса
  // после обрыва) не должно завести вторую строку на один объект.
  const already = await db.photo.findFirst({
    where: { eventId: guest.eventId, storageKey: input.storageKey },
    select: { id: true },
  });
  if (already) return { ok: false, reason: "duplicate", message: (await eventT(guest.eventId))("Это фото уже отправлено", "This photo has already been sent") };

  // Ранняя проверка — чтобы не перекодировать файл, который всё равно не
  // примем. Окончательная — ниже, в транзакции.
  const quota = await guestQuota(guest);
  const t = makeT(quota.language);
  if (quota.left <= 0) {
    // Файл уже лежит в бакете, но принять его нельзя — убираем за собой,
    // иначе за вечер накопится мусор, за который платит организатор.
    await deleteObjects([input.storageKey]).catch(() => {});
    return { ok: false, reason: "limit", message: t("Лимит фотографий исчерпан", "Photo limit reached") };
  }

  let head;
  try {
    head = await headObject(input.storageKey);
  } catch {
    return { ok: false, reason: "missing", message: t("Файл не долетел — попробуйте ещё раз", "The upload didn’t finish. Please try again") };
  }
  if (head.bytes <= 0 || head.bytes > MAX_UPLOAD_BYTES) {
    await deleteObjects([input.storageKey]).catch(() => {});
    return { ok: false, reason: "size", message: t("Файл слишком большой", "The file is too large") };
  }

  // Исходник заменяется перекодированным файлом по тому же ключу: второй
  // копии «на всякий случай» не держим — она весила бы в пять раз больше
  // и хранила бы GPS из EXIF.
  let converted;
  try {
    converted = await convertImage(await readObject(input.storageKey), GUEST_PHOTO);
  } catch {
    await deleteObjects([input.storageKey]).catch(() => {});
    return {
      ok: false,
      reason: "unreadable",
      message: t("Не получилось открыть файл — пришлите фото в JPEG или сделайте снимок экрана", "We couldn’t open the file. Please send a JPEG or a screenshot"),
    };
  }
  const [, , nsfw] = await Promise.all([
    putObject(input.storageKey, converted.body, converted.contentType),
    putObject(thumbKey, converted.thumb!, converted.contentType),
    nsfwScore(converted.thumb!),
  ]);

  // Автомодерация: кадр, в котором фильтр не нашёл 18+, публикуется сразу.
  // Подозрительный — и тот, что фильтр не смог оценить, — ждёт организатора:
  // пропустить непроверенный кадр на экран в зале хуже, чем попросить
  // человека взглянуть на него.
  const autoApproved = nsfw !== null && nsfw < NSFW_FLAG;

  // Лимит и повтор проверяются ещё раз — под блокировкой на гостя.
  // Перекодирование идёт секунду, и за эту секунду гость с двумя
  // вкладками (или скриптом) успевал бы подтвердить десять файлов при
  // лимите в пять: каждый видел «осталось 5» до того, как записался
  // соседний. Блокировка транзакционная и снимается сама.
  const saved = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${guest.guestId}))::text`;
    const [used, duplicate] = await Promise.all([
      tx.photo.count({
        where: { eventId: guest.eventId, guestId: guest.guestId, status: { not: "REJECTED" } },
      }),
      tx.photo.count({ where: { eventId: guest.eventId, storageKey: input.storageKey } }),
    ]);
    if (duplicate > 0) return { error: "duplicate" as const };
    if (used >= quota.limit) return { error: "limit" as const };

    const photo = await tx.photo.create({
      data: {
        orgId: guest.orgId,
        eventId: guest.eventId,
        guestId: guest.guestId,
        storageKey: input.storageKey,
        thumbKey,
        width: converted.width,
        height: converted.height,
        bytes: converted.body.byteLength,
        previewOk: true,
        nsfwScore: nsfw,
        status: autoApproved ? "APPROVED" : "PENDING",
        moderatedAt: autoApproved ? new Date() : null,
      },
    });
    return { photo, left: quota.limit - used - 1 };
  });

  if ("error" in saved) {
    if (saved.error === "duplicate") {
      return { ok: false, reason: "duplicate", message: t("Это фото уже отправлено", "This photo has already been sent") };
    }
    await deleteObjects([input.storageKey, thumbKey]).catch(() => {});
    return { ok: false, reason: "limit", message: t("Лимит фотографий исчерпан", "Photo limit reached") };
  }
  // Экран в зале узнаёт о новом снимке так же, как о ручном одобрении.
  if (autoApproved) await bus.publish(guest.eventId, "photo", saved.photo.id);
  return { ok: true, photoId: saved.photo.id, left: saved.left };
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

/** Отклонённые — отдельной полкой: их можно пересмотреть и вернуть. */
export async function listRejectedPhotos(eventId: string, limit = 200) {
  return db.photo.findMany({
    where: { eventId, status: "REJECTED" },
    orderBy: [{ moderatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, createdAt: true, guest: { select: { displayName: true } } },
  });
}

export async function listPendingPhotos(eventId: string, limit = 100) {
  return db.photo.findMany({
    where: { eventId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true, previewOk: true, width: true, height: true, bytes: true, createdAt: true,
      nsfwScore: true,
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
  if (updated.count !== 1) return false;

  // Экран в зале узнаёт о решении событием. Событие шлём на любое решение,
  // включая снятие с публикации: «убрали с экрана» должно означать
  // именно это, а не «убрали, но там ещё висит».
  await bus.publish(ctx.eventId, "photo", photoId);
  return true;
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
  await bus.publish(ctx.eventId, "photo", photo.id);
  return true;
}
