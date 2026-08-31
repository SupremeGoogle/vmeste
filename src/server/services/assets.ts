/**
 * Картинки, которые загружает организатор: обложка приглашения, фон,
 * фотография пары.
 *
 * Контур тот же, что у гостевых фотографий (`services/photos.ts`), и по
 * тем же причинам: файл идёт в хранилище напрямую по подписанной ссылке,
 * а строка в базе создаётся не при выдаче ссылки, а при подтверждении —
 * и подтверждение перепроверяет объект через `HeadObject`. Размер и тип
 * берутся у хранилища, а не со слов браузера.
 *
 * Отличий от гостевого пути два, и оба намеренные:
 *   — нет модерации: организатор сам себе модератор;
 *   — нет лимита на количество: за свои картинки он отвечает сам, а
 *     общий тормоз — размер файла, он тот же.
 */
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import {
  ALLOWED_TYPES, MAX_UPLOAD_BYTES, assetKey, deleteObjects, headObject, presignUpload,
} from "@/server/storage/s3";

export type AssetView = {
  id: string;
  url: string;
  alt: string;
  bytes: number;
};

/** Адрес, по которому картинку отдаёт приложение. Бакет закрыт целиком. */
export function assetUrl(eventId: string, assetId: string): string {
  return `/api/asset/${eventId}/${assetId}`;
}

export type StartUpload =
  | { ok: true; uploadUrl: string; key: string }
  | { ok: false; message: string };

/** Подписанная ссылка на загрузку. Тип проверяется здесь, размер — при подтверждении. */
export async function startAssetUpload(
  ctx: EventContext,
  contentType: string,
  declaredBytes: number,
): Promise<StartUpload> {
  if (!ALLOWED_TYPES.includes(contentType)) {
    return { ok: false, message: "Принимаем только изображения: JPEG, PNG, WebP или HEIC." };
  }
  if (declaredBytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ. Уменьшите его и попробуйте ещё раз.`,
    };
  }

  const key = assetKey(ctx.eventId);
  return { ok: true, uploadUrl: await presignUpload(key, contentType), key };
}

export type CompleteUpload = { ok: true; asset: AssetView } | { ok: false; message: string };

/**
 * Подтверждение загрузки. Ключ проверяется на принадлежность мероприятию,
 * а объект — на существование: без этого можно было бы завести строку в
 * базе, ничего не загрузив, и получить битую картинку в приглашении.
 */
export async function completeAssetUpload(
  ctx: EventContext,
  key: string,
  alt: string,
): Promise<CompleteUpload> {
  if (!key.startsWith(`events/${ctx.eventId}/assets/`)) {
    return { ok: false, message: "Файл не относится к этому мероприятию." };
  }

  let head;
  try {
    head = await headObject(key);
  } catch {
    return { ok: false, message: "Файл не загрузился. Попробуйте ещё раз." };
  }

  if (head.bytes > MAX_UPLOAD_BYTES) {
    // Браузер соврал о размере в первом запросе — убираем за собой.
    await deleteObjects([key]).catch(() => {});
    return { ok: false, message: "Файл больше допустимого." };
  }

  const asset = await db.eventAsset.create({
    data: {
      orgId: ctx.orgId,
      eventId: ctx.eventId,
      storageKey: key,
      contentType: head.contentType,
      bytes: head.bytes,
      alt: alt.trim().slice(0, 200),
    },
  });

  return {
    ok: true,
    asset: { id: asset.id, url: assetUrl(ctx.eventId, asset.id), alt: asset.alt, bytes: asset.bytes },
  };
}

/** Картинки мероприятия — для выбора обложки в конструкторе. */
export async function listAssets(ctx: EventContext): Promise<AssetView[]> {
  const rows = await db.eventAsset.findMany({
    where: { eventId: ctx.eventId },
    orderBy: { createdAt: "desc" },
    select: { id: true, alt: true, bytes: true },
  });
  return rows.map((row) => ({
    id: row.id,
    url: assetUrl(ctx.eventId, row.id),
    alt: row.alt,
    bytes: row.bytes,
  }));
}

/** Удаление: сначала строка, потом файл. Осиротевший файл в хранилище
 *  дешевле, чем строка, ведущая в никуда. */
export async function deleteAsset(ctx: EventContext, assetId: string): Promise<boolean> {
  const asset = await db.eventAsset.findFirst({
    where: { id: assetId, eventId: ctx.eventId },
    select: { id: true, storageKey: true },
  });
  if (!asset) return false;

  // `deleteMany` с обоими условиями, а не `delete` по одному id: страж
  // мультиарендности требует фильтр по мероприятию в каждом запросе, и
  // требует справедливо — проверка выше защищает от чужого, а фильтр
  // здесь защищает от того, что проверку однажды уберут.
  await db.eventAsset.deleteMany({ where: { id: asset.id, eventId: ctx.eventId } });
  await deleteObjects([asset.storageKey]).catch(() => {});
  return true;
}
