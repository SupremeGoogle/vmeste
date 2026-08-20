/**
 * Заслон против утечки между мероприятиями (PLAN.md §1.2).
 *
 * Проверяется всё три слоя защиты:
 *   1. составные внешние ключи — БД физически не даёт связать чужое;
 *   2. репозитории — всегда фильтруют по eventId;
 *   3. страж PrismaClient — ловит запрос без фильтра.
 *
 * Этот файл дописывается при каждом новом репозитории.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import { db } from "@/server/db";
import { normalizeName } from "@/lib/name-normalize";
import { listGuests, createGuest, getGuest, archiveGuest } from "@/server/repositories/guests";
import { listEvents, findEventByShortCode, getEvent } from "@/server/repositories/events";
import {
  addBlock, deleteBlock, listBlocks, moveBlock, setBlockVisible, updateBlockContent,
} from "@/server/repositories/invites";
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { defaultContent } from "@/lib/invite-blocks";
import type { EventContext, OrgContext } from "@/server/context";

type World = {
  orgId: string;
  userId: string;
  eventId: string;
  guestId: string;
  seatId: string;
  tableId: string;
  ctx: EventContext;
  orgCtx: OrgContext;
};

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({
    data: {
      name: `Организация ${slug}`,
      slug,
      members: {
        create: {
          role: "OWNER",
          user: {
            create: {
              email: `${slug}@example.com`,
              name: `Пользователь ${slug}`,
              passwordHash: "scrypt$00$00",
            },
          },
        },
      },
    },
    include: { members: true },
  });

  const event = await testDb.event.create({
    data: {
      orgId: org.id,
      title: `Свадьба ${slug}`,
      slug,
      shortCode: code,
      eventDate: new Date("2026-09-12"),
    },
  });

  const table = await testDb.seatTable.create({
    data: { orgId: org.id, eventId: event.id, label: "Стол 1", x: 100, y: 100, capacity: 8 },
  });

  const seat = await testDb.seat.create({
    data: { orgId: org.id, eventId: event.id, tableId: table.id, index: 0 },
  });

  const guest = await testDb.guest.create({
    data: {
      orgId: org.id,
      eventId: event.id,
      displayName: "Анастасия Петрова",
      searchKey: normalizeName("Анастасия Петрова"),
      linkToken: randomBytes(16).toString("base64url"),
    },
  });

  const orgCtx: OrgContext = {
    kind: "org",
    userId: org.members[0].userId,
    orgId: org.id,
    role: "OWNER",
  };

  return {
    orgId: org.id,
    userId: org.members[0].userId,
    eventId: event.id,
    guestId: guest.id,
    seatId: seat.id,
    tableId: table.id,
    orgCtx,
    ctx: { ...orgCtx, eventId: event.id },
  };
}

let a: World;
let b: World;

beforeAll(async () => {
  await resetDb();
  a = await makeWorld("org-a", "AAAAAA");
  b = await makeWorld("org-b", "BBBBBB");
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("слой 1: составные внешние ключи", () => {
  it("не даёт посадить гостя чужого мероприятия за свой стол", async () => {
    await expect(
      testDb.seat.update({
        where: { id: a.seatId },
        data: { guestId: b.guestId },
      }),
    ).rejects.toThrow();
  });

  it("не даёт создать место, ссылающееся на стол чужого мероприятия", async () => {
    await expect(
      testDb.seat.create({
        data: { orgId: a.orgId, eventId: a.eventId, tableId: b.tableId, index: 7 },
      }),
    ).rejects.toThrow();
  });

  it("не даёт создать алиас для гостя чужого мероприятия", async () => {
    await expect(
      testDb.guestAlias.create({
        data: { orgId: a.orgId, eventId: a.eventId, guestId: b.guestId, alias: "настя" },
      }),
    ).rejects.toThrow();
  });

  it("не даёт создать мероприятие под чужой организацией с чужим блоком", async () => {
    await expect(
      testDb.inviteBlock.create({
        data: { orgId: b.orgId, eventId: a.eventId, type: "COVER", order: 0 },
      }),
    ).rejects.toThrow();
  });
});

describe("слой 2: репозитории фильтруют по контексту", () => {
  it("список гостей содержит только своих", async () => {
    const guests = await listGuests(a.ctx);
    expect(guests).toHaveLength(1);
    expect(guests[0].id).toBe(a.guestId);
  });

  it("гость чужого мероприятия не читается по id", async () => {
    expect(await getGuest(a.ctx, b.guestId)).toBeNull();
  });

  it("список мероприятий содержит только свои", async () => {
    const events = await listEvents(a.orgCtx);
    expect(events.map((e) => e.id)).toEqual([a.eventId]);
  });

  it("чужое мероприятие не читается по id", async () => {
    expect(await getEvent(a.orgCtx, b.eventId)).toBeNull();
  });

  it("создание гостя приписывает его текущему мероприятию", async () => {
    const guest = await createGuest(a.ctx, { displayName: "Проверочный Гость" });
    expect(guest.eventId).toBe(a.eventId);
    expect(guest.orgId).toBe(a.orgId);
    await archiveGuest(a.ctx, guest.id);
  });

  it("архивирование не трогает гостей чужого мероприятия", async () => {
    await expect(archiveGuest(a.ctx, b.guestId)).rejects.toThrow();
    const other = await testDb.guest.findUnique({ where: { id: b.guestId } });
    expect(other?.archivedAt).toBeNull();
  });
});

describe("слой 3: страж PrismaClient", () => {
  it("бросает на запросе к гостям без фильтра по мероприятию", async () => {
    await expect(db.guest.findMany({})).rejects.toThrow(/tenancy/);
  });

  it("бросает на создании гостя без eventId", async () => {
    await expect(
      // @ts-expect-error — намеренно неполные данные, проверяем именно стража
      db.guest.create({ data: { displayName: "Без мероприятия" } }),
    ).rejects.toThrow(/tenancy/);
  });

  it("пропускает запрос с фильтром", async () => {
    const guests = await db.guest.findMany({ where: { eventId: a.eventId } });
    expect(guests.length).toBeGreaterThan(0);
  });
});

describe("публичный вход по короткому коду", () => {
  it("код одного мероприятия не открывает другое", async () => {
    const event = await findEventByShortCode("AAAAAA");
    expect(event?.id).toBe(a.eventId);
    expect(event?.id).not.toBe(b.eventId);
  });

  it("несуществующий код ничего не возвращает", async () => {
    expect(await findEventByShortCode("ZZZZZZ")).toBeNull();
  });
});

describe("приглашение: блоки и именные ссылки", () => {
  it("список блоков не показывает чужие", async () => {
    await addBlock(a.ctx, "COVER");
    await addBlock(b.ctx, "COVER");

    const blocks = await listBlocks(a.ctx);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("COVER");
  });

  it("правка блока чужого мероприятия ничего не меняет", async () => {
    const foreign = await addBlock(b.ctx, "TEXT");

    const changed = await updateBlockContent(a.ctx, foreign.id, {
      ...defaultContent("TEXT"),
      text: "подмена",
    });
    expect(changed).toBe(false);

    const untouched = await testDb.inviteBlock.findUniqueOrThrow({ where: { id: foreign.id } });
    expect(untouched.content).toEqual(defaultContent("TEXT"));
  });

  it("скрытие и удаление чужого блока не проходят", async () => {
    const foreign = await addBlock(b.ctx, "TEXT");

    await setBlockVisible(a.ctx, foreign.id, false);
    await deleteBlock(a.ctx, foreign.id);
    await moveBlock(a.ctx, foreign.id, 1);

    const survived = await testDb.inviteBlock.findUnique({ where: { id: foreign.id } });
    expect(survived?.visible).toBe(true);
  });

  it("именная ссылка находит гостя вместе с его мероприятием", async () => {
    const guest = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    const found = await findGuestByLinkToken(guest.linkToken);
    expect(found?.eventId).toBe(a.eventId);
  });

  it("токен гостя не открывает соседнее мероприятие", async () => {
    const guest = await testDb.guest.findUniqueOrThrow({ where: { id: b.guestId } });
    const found = await findGuestByLinkToken(guest.linkToken);
    expect(found?.eventId).toBe(b.eventId);
    expect(found?.eventId).not.toBe(a.eventId);
  });

  it("исключение для токена узкое: запрос к гостям без токена и без eventId по-прежнему падает", async () => {
    await expect(db.guest.findMany({ where: { displayName: "Анастасия Петрова" } })).rejects.toThrow(
      /tenancy/,
    );
  });
});
