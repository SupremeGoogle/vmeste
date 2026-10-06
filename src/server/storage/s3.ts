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
 *     после загрузки сервер один раз читает исходник и кладёт на его место
 *     перекодированный WebP (`putObject` / `readObject`);
 *   — чтение объекта потоком: отдаёт его `/api/media/[eventId]/[photoId]` после
 *     проверки прав. Presigned GET сознательно не используется — ссылка,
 *     живущая шесть часов, переживает и отзыв фото, и его отклонение.
 */
import { randomUUID } from "node:crypto";
import {
  CopyObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command,
  PutObjectCommand, S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Что принимаем на загрузку. Список широкий намеренно: всё пришедшее
 * сервер перекодирует в WebP (`server/images/convert.ts`), а настоящий
 * формат определяет по содержимому, а не по этому заголовку.
 *
 * `application/octet-stream` — не лазейка, а частый случай: Chrome на
 * Windows и часть Android отдают HEIC с пустым `file.type`. Отказать
 * такому гостю значило бы потерять кадр с айфона из-за чужого браузера.
 */
export const ALLOWED_TYPES = [
  "image/jpeg", "image/pjpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence",
  "image/tiff", "image/bmp", "image/x-ms-bmp", "application/octet-stream",
];
/**
 * Предел для исходника гостя. Он выше, чем вес итогового файла: сервер
 * ужимает кадр до 2560 px, а до того в хранилище лежит то, что прислал
 * телефон, — у 48-мегапиксельного HEIC это 15–25 МБ.
 */
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

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
let publicClient: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;
  client = makeClient(config().endpoint);
  return client;
}

/**
 * Клиент для подписанных ссылок, по которым браузер гостя кладёт фото
 * прямо в хранилище. Сервер ходит в MinIO по 127.0.0.1, а телефону нужен
 * внешний адрес — S3_PUBLIC_ENDPOINT (nginx передаёт Host как есть, так что
 * подпись сходится). Не задан — тот же адрес, что у сервера (локально).
 */
function s3Public(): S3Client {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT;
  if (!endpoint) return s3();
  publicClient ??= makeClient(endpoint);
  return publicClient;
}

function makeClient(endpoint: string): S3Client {
  const cfg = config();
  return new S3Client({
    endpoint,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    // MinIO живёт по пути (`host/bucket/key`), а не по поддомену.
    // На проде (S3/R2) это тоже работает, поэтому включено всегда:
    // одна настройка вместо двух разных поведений.
    forcePathStyle: true,
    // Новый SDK по умолчанию кладёт в подписанную ссылку CRC32 — посчитанный
    // по пустому телу, ведь файла при подписи ещё нет. MinIO это пропускает,
    // Garage на сервере честно сверяет и отвечает InvalidDigest. Контрольные
    // суммы — только там, где их требует сам S3 (DeleteObjects).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/** Хранилище отвечает — для /api/health и панели суперадмина. */
export async function storageReachable(timeoutMs = 3000): Promise<boolean> {
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    await s3().send(new HeadBucketCommand({ Bucket: bucketName() }), { abortSignal: AbortSignal.timeout(timeoutMs) });
    return true;
  } catch {
    return false;
  }
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

/** Ключ превью по ключу фото: оба выдаёт `photoKeys` из одного id. */
export function thumbKeyFor(storageKey: string): string | null {
  const match = /^events\/([^/]+)\/photos\/([^/.]+)$/.exec(storageKey);
  return match ? `events/${match[1]}/thumbs/${match[2]}.webp` : null;
}

/**
 * Ключ для картинки, которую загружает сам организатор: обложка
 * приглашения, фон шаблона, фотография пары.
 *
 * Отдельный префикс `assets/`, а не общий с гостевыми фотографиями,
 * ровно по одной причине: гостевые фото модерируются и удаляются
 * пачками, а обложка приглашения живёт, пока живёт свадьба. Смешав их в
 * одном префиксе, мы рано или поздно снесли бы обложку вместе с
 * отклонёнными снимками.
 *
 * Расширение в ключ не пишем: тип хранится в БД, а по нему и отдаётся.
 */
export function assetKey(eventId: string): string {
  return `events/${eventId}/assets/${randomUUID()}`;
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
  // `signableHeaders` обязателен: без него презайнер кладёт тип в запрос,
  // но не в подпись, и хранилище принимает PUT с любым `Content-Type`
  // (проверено тестом в `photos-hard.spec.ts`).
  return getSignedUrl(s3Public(), command, {
    expiresIn: expiresInSeconds,
    signableHeaders: new Set(["content-type"]),
  });
}

/** Размер и тип объекта в хранилище — то, что там на самом деле лежит. */
export async function headObject(key: string) {
  const result = await s3().send(new HeadObjectCommand({ Bucket: bucketName(), Key: key }));
  return { bytes: result.ContentLength ?? 0, contentType: result.ContentType ?? "" };
}

/** Запись объекта сервером — сюда кладётся перекодированный файл. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3().send(
    new PutObjectCommand({ Bucket: bucketName(), Key: key, Body: body, ContentType: contentType }),
  );
}

/** Объект целиком в память — только для перекодирования, размер уже сверен. */
export async function readObject(key: string): Promise<Buffer> {
  const result = await s3().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
  if (!result.Body) throw new Error(`Пустой объект: ${key}`);
  return Buffer.from(await result.Body.transformToByteArray());
}

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  bytes: number;
  /** Есть, только если запрашивали диапазон: `bytes 0-1023/52428800`. */
  contentRange?: string;
};

/**
 * Объект потоком — для `/api/media/[eventId]/[photoId]`.
 *
 * `range` — заголовок `Range` браузера как есть. Нужен видео: Safari без
 * ответа 206 не проигрывает ролик вовсе, а перемотка в любом браузере
 * иначе качает файл с начала.
 */
export async function getObject(key: string, range?: string): Promise<StoredObject | null> {
  try {
    const result = await s3().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: key, Range: range }),
    );
    if (!result.Body) return null;
    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType ?? "application/octet-stream",
      bytes: result.ContentLength ?? 0,
      contentRange: result.ContentRange,
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Копия внутри бакета — без прохода файла через наш сервер. */
export async function copyObject(fromKey: string, toKey: string): Promise<void> {
  await s3().send(
    new CopyObjectCommand({ Bucket: bucketName(), CopySource: `${bucketName()}/${fromKey}`, Key: toKey }),
  );
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
