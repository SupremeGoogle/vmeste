/**
 * Экран в зале: шина событий, токен доступа, снимок состояния.
 *
 * Главное, что здесь проверяется, — поведение при обрыве связи: короткий
 * разрыв должен добираться пропущенными событиями, длинный — честно
 * просить снимок. Ошибка здесь означает экран, который весь вечер
 * показывает вчерашние фотографии и не жалуется.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import { MemoryEventBus } from "@/server/events/bus";
import {
  accessByScreenToken, createScreenToken, listScreenTokens, revokeScreenToken,
  screenSnapshot, setScreenMode, touchScreen,
} from "@/server/services/screen";
import { normalizeName } from "@/lib/name-normalize";
import type { OrgContext } from "@/server/context";

type World = {
  orgId: string;
  eventId: string;
  guestId: string;
  ctx: OrgContext;
};

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug, shortCode: code,
      eventDate: new Date("2026-09-12"),
    },
  });
  const guest = await testDb.guest.create({
    data: {
      orgId: org.id, eventId: event.id, displayName: "Анна Петрова",
      searchKey: normalizeName("Анна Петрова"),
      linkToken: randomBytes(16).toString("base64url"),
    },
  });
  return {
    orgId: org.id,
    eventId: event.id,
    guestId: guest.id,
    ctx: { kind: "org", userId: "u1", orgId: org.id, role: "OWNER" },
  };
}

async function addPhoto(
  world: World,
  status: "PENDING" | "APPROVED" | "REJECTED",
  previewOk = true,
) {
  return testDb.photo.create({
    data: {
      orgId: world.orgId, eventId: world.eventId, guestId: world.guestId,
      storageKey: `events/${world.eventId}/photos/${randomBytes(8).toString("hex")}`,
      thumbKey: `events/${world.eventId}/thumbs/${randomBytes(8).toString("hex")}`,
      width: 600, height: 400, bytes: 1000, status, previewOk,
    },
  });
}

let a: World;
let b: World;

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("screen-a", "SCRNAA");
  b = await makeWorld("screen-b", "SCRNBB");
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("шина событий", () => {
  it("нумерует события подряд внутри мероприятия", async () => {
    const bus = new MemoryEventBus();
    const first = await bus.publish("e1", "photo", "p1");
    const second = await bus.publish("e1", "wish", "w1");
    expect([first.seq, second.seq]).toEqual([1, 2]);
  });

  it("у разных мероприятий нумерация своя и события не смешиваются", async () => {
    const bus = new MemoryEventBus();
    const received: string[] = [];
    bus.subscribe("e1", (event) => received.push(`e1:${event.seq}`));
    bus.subscribe("e2", (event) => received.push(`e2:${event.seq}`));

    await bus.publish("e1", "photo");
    await bus.publish("e2", "photo");

    expect(received).toEqual(["e1:1", "e2:1"]);
  });

  it("после короткого разрыва отдаёт пропущенное", async () => {
    const bus = new MemoryEventBus();
    await bus.publish("e1", "photo", "p1");
    await bus.publish("e1", "photo", "p2");
    await bus.publish("e1", "photo", "p3");

    const missed = bus.replay("e1", 1);
    expect(missed?.map((event) => event.entityId)).toEqual(["p2", "p3"]);
  });

  it("после длинного разрыва просит снимок вместо обрывков", async () => {
    const bus = new MemoryEventBus();
    for (let i = 0; i < 260; i++) await bus.publish("e1", "photo", `p${i}`);

    // Экран отвалился на первом событии — буфер уже провернулся.
    expect(bus.replay("e1", 1)).toBeNull();
    // А недавнее ещё на месте.
    expect(bus.replay("e1", 259)).toHaveLength(1);
  });

  it("номер из будущего — повод забрать снимок, а не «ничего нового»", async () => {
    // Так выглядит экран, переживший перезапуск сервера: нумерация
    // началась заново, а он помнит номер из прошлой жизни.
    const bus = new MemoryEventBus();
    await bus.publish("e1", "photo");
    expect(bus.replay("e1", 999)).toBeNull();
    expect(bus.replay("e1", 1)).toEqual([]);
  });

  it("незнакомое мероприятие — тоже повод забрать снимок", async () => {
    const bus = new MemoryEventBus();
    expect(bus.replay("никогда-не-было", 5)).toBeNull();
  });

  it("отписка снимает подписчика", async () => {
    const bus = new MemoryEventBus();
    const unsubscribe = bus.subscribe("e1", () => {});
    expect(bus.subscriberCount("e1")).toBe(1);
    unsubscribe();
    expect(bus.subscriberCount("e1")).toBe(0);
  });

  it("падение одного подписчика не мешает остальным", async () => {
    const bus = new MemoryEventBus();
    const seen: number[] = [];
    bus.subscribe("e1", () => {
      throw new Error("экран отвалился");
    });
    bus.subscribe("e1", (event) => seen.push(event.seq));

    await bus.publish("e1", "photo");
    expect(seen).toEqual([1]);
  });
});

describe("токен экрана", () => {
  it("открывает своё мероприятие", async () => {
    const created = await createScreenToken(a.ctx, a.eventId, "Проектор");
    const access = await accessByScreenToken(created!.token);
    expect(access?.eventId).toBe(a.eventId);
  });

  it("отозванный перестаёт работать сразу", async () => {
    const created = await createScreenToken(a.ctx, a.eventId, "Проектор");
    await revokeScreenToken(a.ctx, a.eventId, created!.id);
    expect(await accessByScreenToken(created!.token)).toBeNull();
  });

  it("нельзя создать токен на чужое мероприятие", async () => {
    expect(await createScreenToken(a.ctx, b.eventId, "Чужой")).toBeNull();
  });

  it("нельзя отозвать чужой токен", async () => {
    const foreign = await createScreenToken(b.ctx, b.eventId, "Проектор");
    expect(await revokeScreenToken(a.ctx, a.eventId, foreign!.id)).toBe(false);
    expect(await accessByScreenToken(foreign!.token)).not.toBeNull();
  });

  it("в списке видны только свои токены", async () => {
    await createScreenToken(a.ctx, a.eventId, "Свой");
    await createScreenToken(b.ctx, b.eventId, "Чужой");
    const tokens = await listScreenTokens(a.ctx, a.eventId);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].label).toBe("Свой");
  });

  it("отметка «на связи» ставится и не течёт на чужой токен", async () => {
    const mine = await createScreenToken(a.ctx, a.eventId, "Свой");
    await touchScreen(mine!.id, a.eventId);
    const row = await testDb.screenToken.findUniqueOrThrow({ where: { id: mine!.id } });
    expect(row.lastSeenAt).not.toBeNull();

    await touchScreen(mine!.id, b.eventId);
    const again = await testDb.screenToken.findUniqueOrThrow({ where: { id: mine!.id } });
    expect(again.lastSeenAt?.getTime()).toBe(row.lastSeenAt?.getTime());
  });
});

describe("снимок состояния", () => {
  it("показывает только одобренное и только своего мероприятия", async () => {
    await addPhoto(a, "APPROVED");
    await addPhoto(a, "PENDING");
    await addPhoto(b, "APPROVED");

    const created = await createScreenToken(a.ctx, a.eventId, "Проектор");
    const access = await accessByScreenToken(created!.token);
    const snapshot = await screenSnapshot(access!);

    expect(snapshot.photos).toHaveLength(1);
  });

  it("не пускает на проектор фото без превью", async () => {
    // Браузер не смог его уменьшить — велик шанс, что и проектор не покажет.
    await addPhoto(a, "APPROVED", false);
    const created = await createScreenToken(a.ctx, a.eventId, "Проектор");
    const access = await accessByScreenToken(created!.token);

    expect((await screenSnapshot(access!)).photos).toHaveLength(0);
  });

  it("несёт режим и номер последнего события", async () => {
    const created = await createScreenToken(a.ctx, a.eventId, "Проектор");
    const access = await accessByScreenToken(created!.token);

    await setScreenMode(a.ctx, a.eventId, "WISHES");
    const snapshot = await screenSnapshot(access!);

    expect(snapshot.mode).toBe("WISHES");
    expect(snapshot.seq).toBeGreaterThan(0);
  });

  it("режим чужого мероприятия не переключается", async () => {
    expect(await setScreenMode(a.ctx, b.eventId, "RAFFLE")).toBe(false);
    const event = await testDb.event.findUniqueOrThrow({ where: { id: b.eventId } });
    expect(event.screenMode).toBe("MIXED");
  });
});
