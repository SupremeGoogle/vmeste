/**
 * Хранилище фотографий.
 *
 * Бакет закрыт целиком (PLAN.md §4.5). Публичного доступа к объектам нет
 * ни у одного ключа: «неугадываемый URL» не годится, потому что ссылка на
 * неодобренное фото утекает через историю браузера и превью в мессенджерах,
 * а требование «на экран только после одобрения» — жёсткое.
 *
 * Наружу отсюда торчат ровно две операции:
 *   — presigned PUT: гость грузит файл напрямую в хранилище, минуя наш сервер
 *     (иначе 12-мегапиксельный кадр с телефона пойдёт через Node дважды);
 *   — чтение объекта потоком: отдаёт его `/api/media/[eventId]/[photoId]` после
 *     проверки прав. Presigned GET сознательно не используется — ссылка,
 *     живущая шесть часов, переживает и отзыв фото, и его отклонение.
 */
import { randomUUID } from "node:crypto";
import {
  DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command,
  PutObjectCommand, S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Что принимаем от гостя. HEIC — с айфонов, он приходит чаще, чем кажется. */
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
/** 12 МБ: больше — это уже не «фото с телефона», а промах или атака. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
/** Превью делает браузер, поэтому его размер известен и мал. */
export const MAX_THUMB_BYTES = 1024 * 1024;

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
};

function config(): StorageConfig {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    throw new Error(
      "Не настроено хранилище: нужны S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY (см. .env.example)",
    );
  }
  return { endpoint, bucket, accessKey, secretKey, region: process.env.S3_REGION ?? "us-east-1" };
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;
  const cfg = config();
  client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    // MinIO живёт по пути (`host/bucket/key`), а не по поддомену.
    // На проде (S3/R2) это тоже работает, поэтому включено всегда:
    // одна настройка вместо двух разных поведений.
    forcePathStyle: true,
  });
  return client;
}

export function bucketName(): string {
  return config().bucket;
}

/**
 * Ключ объекта формирует сервер, а не клиент.
 *
 * Имя файла с телефона в ключ не попадает вовсе: там бывают и пробелы,
 * и кириллица, и `../`, и просто `IMG_0001.HEIC` у сорока гостей сразу.
 * Мероприятие в префиксе — чтобы удаление свадьбы удаляло и её файлы
 * одним `list + delete` по префиксу.
 */
export function photoKeys(eventId: string): { storageKey: string; thumbKey: string } {
  const id = randomUUID();
  return {
    storageKey: `events/${eventId}/photos/${id}`,
    thumbKey: `events/${eventId}/thumbs/${id}.webp`,
  };
}

/** Принадлежит ли ключ этому мероприятию. Проверяется перед отдачей файла:
 *  строка в БД и объект в бакете должны совпадать по хозяину. */
export function keyBelongsToEvent(key: string, eventId: string): boolean {
  return key.startsWith(`events/${eventId}/`);
}

/**
 * Ссылка на загрузку. Подпись включает `Content-Type`: браузер обязан
 * прислать ровно тот тип, который мы разрешили, иначе хранилище само
 * отвергнет запрос — проверка не остаётся на совести клиента.
 *
 * `Content-Length` в подпись не входит: браузер не даёт задать его для
 * `fetch` с телом, и подписанный заголовок сделал бы загрузку невозможной.
 * Настоящий размер приходит с `/complete` и сверяется с `HeadObject`.
 */
export async function presignUpload(
  key: string,
  contentType: string,
  expiresInSeconds = 15 * 60,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3(), command, { expiresIn: expiresInSeconds });
}

/** Размер и тип объекта в хранилище — то, что там на самом деле лежит. */
export async function headObject(key: string) {
  const result = await s3().send(new HeadObjectCommand({ Bucket: bucketName(), Key: key }));
  return { bytes: result.ContentLength ?? 0, contentType: result.ContentType ?? "" };
}

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  bytes: number;
};

/** Объект потоком — для `/api/media/[eventId]/[photoId]`. */
export async function getObject(key: string): Promise<StoredObject | null> {
  try {
    const result = await s3().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
    if (!result.Body) return null;
    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType ?? "application/octet-stream",
      bytes: result.ContentLength ?? 0,
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await s3().send(
    new DeleteObjectsCommand({
      Bucket: bucketName(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}

/**
 * Удалить всё под префиксом.
 *
 * Нужно там, где уходит целое мероприятие: строки в БД снимет каскад, а
 * объекты в бакете иначе останутся навсегда — за них платит организатор.
 * Этим же прибирают за собой тесты.
 */
export async function deletePrefix(prefix: string): Promise<number> {
  let removed = 0;
  let token: string | undefined;

  do {
    const listed = await s3().send(
      new ListObjectsV2Command({ Bucket: bucketName(), Prefix: prefix, ContinuationToken: token }),
    );
    const keys = (listed.Contents ?? []).map((item) => item.Key).filter((k): k is string => !!k);
    await deleteObjects(keys);
    removed += keys.length;
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);

  return removed;
}

function isNotFound(error: unknown): boolean {
  const name = (error as { name?: string; Code?: string })?.name;
  return name === "NoSuchKey" || name === "NotFound";
}

export { isNotFound };
