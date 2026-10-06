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
 *     общий тормоз — размер файла.
 *
 * Картинка при подтверждении перекодируется в WebP, но мягче, чем фото
 * гостей (`INVITE_ASSET`: до 3200 px, качество 88, анимация сохраняется):
 * обложку разглядывают на весь экран. Без этого PNG-обложку на 10 МБ
 * качал бы каждый гость, открывший приглашение с телефона.
 */
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import { INVITE_ASSET, convertImage } from "@/server/images/convert";
import { NSFW_BLOCK, nsfwScore } from "@/server/images/nsfw";
import {
  ALLOWED_TYPES, assetKey, deleteObjects, headObject, presignUpload, putObject, readObject,
} from "@/server/storage/s3";

export type AssetView = {
  id: string;
  url: string;
  alt: string;
  bytes: number;
};

/**
 * Музыка приглашения — тот же контур, что у картинок: организатор загружает
 * песню, под которую гость открывает конверт. Лимит больше, чем у фото:
 * трёхминутный MP3 весит 5–8 МБ.
 */
export const AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a"];
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/**
 * Предел для исходной картинки. После перекодирования обложка весит
 * 0,3–1,5 МБ, а 25 МБ хватает и на PNG из фотошопа, и на полноразмерный
 * кадр с зеркалки.
 */
export const MAX_ASSET_BYTES = 25 * 1024 * 1024;

const limitFor = (contentType: string) =>
  AUDIO_TYPES.includes(contentType) ? MAX_AUDIO_BYTES : MAX_ASSET_BYTES;

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
  if (!ALLOWED_TYPES.includes(contentType) && !AUDIO_TYPES.includes(contentType)) {
    return { ok: false, message: "Принимаем изображения (JPEG, PNG, WebP, HEIC, GIF и др.) и музыку (MP3, M4A)." };
  }
  const limit = limitFor(contentType);
  if (declaredBytes > limit) {
    return {
      ok: false,
      message: `Файл больше ${Math.round(limit / 1024 / 1024)} МБ. Уменьшите его и попробуйте ещё раз.`,
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

  if (head.bytes > limitFor(head.contentType)) {
    // Браузер соврал о размере в первом запросе — убираем за собой.
    await deleteObjects([key]).catch(() => {});
    return { ok: false, message: "Файл больше допустимого." };
  }

  // Песня остаётся как есть, картинка заменяется WebP по тому же ключу.
  let stored = { contentType: head.contentType, bytes: head.bytes };
  if (!AUDIO_TYPES.includes(head.contentType)) {
    let converted;
    try {
      converted = await convertImage(await readObject(key), INVITE_ASSET);
    } catch {
      await deleteObjects([key]).catch(() => {});
      return { ok: false, message: "Не получилось открыть картинку. Попробуйте JPEG или PNG." };
    }
    // Обложку никто не модерирует, а видит её каждый гость, — поэтому
    // здесь фильтр отказывает, а не просто помечает. Порог высокий.
    const nsfw = await nsfwScore(converted.body);
    if (nsfw !== null && nsfw >= NSFW_BLOCK) {
      await deleteObjects([key]).catch(() => {});
      return { ok: false, message: "Эта картинка похожа на откровенную. Выберите другую." };
    }
    await putObject(key, converted.body, converted.contentType);
    stored = { contentType: converted.contentType, bytes: converted.body.byteLength };
  }

  const asset = await db.eventAsset.create({
    data: {
      orgId: ctx.orgId,
      eventId: ctx.eventId,
      storageKey: key,
      contentType: stored.contentType,
      bytes: stored.bytes,
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
    // Песни лежат рядом с картинками, но в выборе обложки им не место:
    // браузер нарисовал бы вместо них битые картинки.
    where: { eventId: ctx.eventId, contentType: { notIn: AUDIO_TYPES } },
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

/** Загруженные песни — для выбора музыки приглашения. */
export async function listAudioAssets(ctx: EventContext): Promise<AssetView[]> {
  const rows = await db.eventAsset.findMany({
    where: { eventId: ctx.eventId, contentType: { in: AUDIO_TYPES } },
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
