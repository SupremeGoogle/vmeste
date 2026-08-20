/**
 * Наполнение очереди модерации.
 *
 * Отдельно от основного seed и запускается руками: он требует поднятого
 * хранилища и заливает в него настоящие файлы. Нужен для двух проверок,
 * которые на трёх фотографиях не делаются:
 *   — разобрать 50 фото горячими клавишами меньше чем за 2 минуты;
 *   — увидеть ленту на экране в зале (этап 6) непустой.
 *
 * Картинки рисуются здесь же, чтобы не тащить в репозиторий бинарники:
 * PNG простой структуры, каждая своего цвета — на глаз видно, что порядок
 * в очереди не путается.
 */
import "dotenv/config";
import { deflateSync } from "node:zlib";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { photoKeys } from "../src/server/storage/s3";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(head));
  return Buffer.concat([length, head, crc]);
}

/** Плашка сплошного цвета: PNG, который откроет любой браузер. */
function png(width: number, height: number, hue: number): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width * 3 + 1);
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = (hue * 37 + x) % 256;
      row[2 + x * 3] = (hue * 91 + y) % 256;
      row[3 + x * 3] = (hue * 53) % 256;
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function main() {
  const count = Number(process.argv[2] ?? 50);
  const slug = process.argv[3] ?? "anya-misha";

  const event = await db.event.findFirstOrThrow({ where: { slug } });
  const guests = await db.guest.findMany({
    where: { eventId: event.id, archivedAt: null },
    take: 12,
    orderBy: { createdAt: "asc" },
  });
  if (guests.length === 0) throw new Error("Сначала запустите npm run db:seed");

  const bucket = process.env.S3_BUCKET;
  for (let i = 0; i < count; i++) {
    const guest = guests[i % guests.length];
    const keys = photoKeys(event.id);
    const body = png(600, 400, i);
    const thumb = png(200, 133, i);

    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: keys.storageKey, Body: body, ContentType: "image/png",
    }));
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: keys.thumbKey, Body: thumb, ContentType: "image/png",
    }));

    await db.photo.create({
      data: {
        orgId: event.orgId,
        eventId: event.id,
        guestId: guest.id,
        storageKey: keys.storageKey,
        thumbKey: keys.thumbKey,
        width: 600,
        height: 400,
        bytes: body.byteLength,
        // Каждое десятое — без превью: так видно плашку «превью не получилось».
        previewOk: i % 10 !== 0,
        status: "PENDING",
      },
    });
  }

  console.log(`Готово: ${count} фото в очереди мероприятия «${event.title}».`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
