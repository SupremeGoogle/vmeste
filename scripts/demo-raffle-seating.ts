/** Local showroom data only. Does not reset or modify other weddings. */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "../src/server/db";
import { normalizeName } from "../src/lib/name-normalize";
import { createRaffle, fixEntries, drawWinner } from "../src/server/services/raffle";
import type { EventContext } from "../src/server/context";
import type { GuestRole, TableShape } from "../src/generated/prisma/enums";

const names = [
  "Ирина Соколова", "Павел Крылов", "Мария Гринёва", "Тимур Асланов",
  "Ольга Литвин", "Артём Дроздов", "Елена Орлова", "Алексей Воронов",
  "Анастасия Петрова", "Максим Волков", "Софья Белова", "Дмитрий Кузнецов",
  "Дарья Морозова", "Роман Фомин", "Виктория Егорова", "Никита Жуков",
  "Алина Попова", "Кирилл Романов", "Полина Титова", "Андрей Мельников",
  "Екатерина Миронова", "Илья Лебедев", "Вера Зайцева", "Михаил Комаров",
  "Ксения Павлова", "Сергей Фёдоров", "Юлия Макарова", "Антон Васильев",
  "Наталья Смирнова", "Денис Медведев", "Татьяна Новикова", "Олег Назаров",
];

async function main() {
  const database = new URL(process.env.DATABASE_URL ?? "");
  const storage = new URL(process.env.S3_ENDPOINT ?? "");
  const isLocal = (url: URL) => ["127.0.0.1", "localhost"].includes(url.hostname);
  if (!isLocal(database) || database.pathname !== "/vmeste_dev" || !isLocal(storage)) {
    throw new Error("This example is restricted to the local vmeste_dev database and local storage.");
  }
  const membership = await db.membership.findFirstOrThrow({
    where: { user: { email: "1@1" } }, orderBy: { id: "asc" },
  });
  const event = await db.event.upsert({
    where: { orgId_slug: { orgId: membership.orgId, slug: "showroom-raffle-seating" } },
    update: {},
    create: {
      orgId: membership.orgId, title: "Аня и Миша · демонстрация",
      slug: "showroom-raffle-seating", shortCode: "DEMRFL",
      eventDate: new Date("2026-11-15T15:00:00Z"), venueName: "Демонстрационная свадьба",
      hallWidth: 1000, hallHeight: 760, screenMode: "RAFFLE",
    },
  });
  const ctx: EventContext = {
    kind: "org", orgId: event.orgId, eventId: event.id,
    userId: membership.userId, role: membership.role,
  };
  const guests = [];
  const people: { name: string; role: GuestRole }[] = [
    ...names.map(name => ({ name, role: "GUEST" as const })),
    { name: "Анна Соколова", role: "BRIDE" },
    { name: "Михаил Соколов", role: "GROOM" },
  ];
  for (const person of people) {
    const existing = await db.guest.findFirst({ where: { eventId: event.id, displayName: person.name } });
    guests.push(existing ?? await db.guest.create({ data: {
      orgId: event.orgId, eventId: event.id, displayName: person.name,
      searchKey: normalizeName(person.name), role: person.role,
      rsvpStatus: "ACCEPTED", note: "Локальный демонстрационный пример",
      linkToken: randomBytes(16).toString("base64url"),
    } }));
  }

  const tables: { label: string; shape: TableShape; x: number; y: number; width: number; height: number; rotation: number; capacity: number; isCouple: boolean }[] = [
    { label: "Стол 1", shape: "ROUND", x: 215, y: 225, width: 116, height: 116, rotation: 0, capacity: 8, isCouple: false },
    { label: "Стол 2", shape: "OVAL", x: 745, y: 285, width: 160, height: 102, rotation: -12, capacity: 8, isCouple: false },
    { label: "Стол 3", shape: "RECT", x: 310, y: 555, width: 172, height: 100, rotation: 17, capacity: 8, isCouple: false },
    { label: "Стол 4", shape: "ROUND", x: 755, y: 615, width: 126, height: 126, rotation: 0, capacity: 8, isCouple: false },
    { label: "Молодожёны", shape: "HEAD", x: 490, y: 90, width: 210, height: 72, rotation: 0, capacity: 2, isCouple: true },
  ];
  for (const [tableNumber, table] of tables.entries()) {
    const row = await db.seatTable.upsert({
      where: { eventId_label: { eventId: event.id, label: table.label } },
      update: table, create: { orgId: event.orgId, eventId: event.id, ...table },
    });
    for (let index = 0; index < table.capacity; index++) {
      const guest = guests[table.isCouple ? 32 + index : tableNumber * 8 + ((index * 3) % 8)];
      await db.seat.upsert({
        where: { tableId_index: { tableId: row.id, index } },
        update: { guestId: guest.id },
        create: { orgId: event.orgId, eventId: event.id, tableId: row.id, index, guestId: guest.id },
      });
    }
  }
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION ?? "us-east-1", forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? "", secretAccessKey: process.env.S3_SECRET_KEY ?? "" },
  });
  const body = await sharp(await readFile("public/media/brand-evening.webp")).resize(900, 600, {fit:"cover"}).jpeg({quality:85}).toBuffer();
  const thumbnail = await sharp(body).resize(300, 200).jpeg({quality:82}).toBuffer();
  for (const guest of guests.slice(0, 12)) {
    if (await db.photo.findFirst({ where: { eventId: event.id, guestId: guest.id, status: "APPROVED" } })) continue;
    const storageKey = `demo/${event.id}/${guest.id}.jpg`;
    const thumbKey = `demo/${event.id}/${guest.id}-thumb.jpg`;
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: storageKey, Body: body, ContentType: "image/jpeg" }));
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: thumbKey, Body: thumbnail, ContentType: "image/jpeg" }));
    await db.photo.create({ data: {
      orgId: event.orgId, eventId: event.id, guestId: guest.id, storageKey, thumbKey,
      width: 900, height: 600, bytes: body.length, status: "APPROVED", moderatedAt: new Date(),
      caption: "Фотография для локальной демонстрации розыгрыша",
    } });
  }
  s3.destroy();
  const title = "Свадебный сюрприз · пример розыгрыша";
  let raffle = await db.raffle.findFirst({ where: { eventId: event.id, title } });
  if (!raffle) {
    const created = await createRaffle(ctx, title);
    raffle = await db.raffle.findFirstOrThrow({ where: { eventId: event.id, id: created.id } });
  }
  if (!raffle.drawnAt) {
    const fixed = await fixEntries(ctx, raffle.id);
    if (!fixed.ok || fixed.total !== 12) throw new Error("Expected twelve demo participants.");
    const drawn = await drawWinner(ctx, raffle.id);
    if (!drawn.ok) throw new Error(drawn.message);
  }
  const result = await db.raffle.findFirstOrThrow({ where: { eventId: event.id, id: raffle.id } });
  const seatCount = await db.seat.count({ where: { eventId: event.id, guestId: {not:null} } });
  if (seatCount !== 34) throw new Error("Expected 34 assigned demo seats.");
  const output = { eventId: event.id, raffleId: raffle.id, guests: 32, assignedSeats: seatCount, participants: 12, winner: result.winnerLabel };
  await mkdir("tmp/real-screen-captures", {recursive:true});
  await writeFile("tmp/real-screen-captures/demo-data.json", JSON.stringify(output, null, 2));
  console.log(output);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
