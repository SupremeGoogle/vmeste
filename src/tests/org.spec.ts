/**
 * Организация: переименование, состав, смена своего пароля.
 *
 * Главное здесь — смена пароля: она закрывает чужие сессии, и ошибка
 * означала бы либо «остался доступ с чужого ноутбука», либо «выкинуло
 * самого себя в день свадьбы».
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import {
  changeOwnPassword, closeOtherSessions, getOrganization, listMembers, renameOrganization,
} from "@/server/repositories/org";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import type { OrgContext } from "@/server/context";

let ctx: OrgContext;
let otherCtx: OrgContext;
let currentSession: string;
let otherSession: string;

beforeEach(async () => {
  await resetDb();

  const org = await testDb.organization.create({
    data: {
      name: "Студия «Вместе»",
      slug: "org-spec",
      members: {
        create: {
          role: "OWNER",
          user: {
            create: {
              email: "planner@org.spec",
              name: "Организатор Аня",
              passwordHash: await hashPassword("правильный-пароль"),
            },
          },
        },
      },
    },
    include: { members: true },
  });

  const foreign = await testDb.organization.create({ data: { name: "Соседи", slug: "org-other" } });

  ctx = { kind: "org", userId: org.members[0].userId, orgId: org.id, role: "OWNER" };
  otherCtx = { kind: "org", userId: org.members[0].userId, orgId: foreign.id, role: "OWNER" };

  const sessions = await Promise.all([
    testDb.session.create({
      data: { id: "session-current", userId: ctx.userId, expiresAt: new Date(Date.now() + 86400000) },
    }),
    testDb.session.create({
      data: { id: "session-other", userId: ctx.userId, expiresAt: new Date(Date.now() + 86400000) },
    }),
  ]);
  currentSession = sessions[0].id;
  otherSession = sessions[1].id;
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("организация", () => {
  it("переименовывается", async () => {
    expect(await renameOrganization(ctx, "Студия «Праздник»")).toBe(true);
    expect((await getOrganization(ctx))?.name).toBe("Студия «Праздник»");
  });

  it("пустое название не принимается", async () => {
    expect(await renameOrganization(ctx, " ")).toBe(false);
    expect((await getOrganization(ctx))?.name).toBe("Студия «Вместе»");
  });

  it("в составе видны только свои участники", async () => {
    expect(await listMembers(ctx)).toHaveLength(1);
    expect(await listMembers(otherCtx)).toHaveLength(0);
  });
});

describe("смена пароля", () => {
  it("требует текущий пароль", async () => {
    expect(await changeOwnPassword(ctx, "не тот", "новый-длинный-пароль", currentSession)).toBe(
      "wrong",
    );
    const user = await testDb.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    expect(await verifyPassword("правильный-пароль", user.passwordHash)).toBe(true);
  });

  it("не принимает короткий новый", async () => {
    expect(await changeOwnPassword(ctx, "правильный-пароль", "коротко", currentSession)).toBe(
      "weak",
    );
  });

  it("меняет пароль и закрывает чужие сессии, оставляя текущую", async () => {
    expect(
      await changeOwnPassword(ctx, "правильный-пароль", "новый-длинный-пароль", currentSession),
    ).toBe("ok");

    const user = await testDb.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    expect(await verifyPassword("новый-длинный-пароль", user.passwordHash)).toBe(true);

    expect(await testDb.session.findUnique({ where: { id: currentSession } })).not.toBeNull();
    expect(await testDb.session.findUnique({ where: { id: otherSession } })).toBeNull();
  });

  it("закрытие чужих сессий не трогает текущую", async () => {
    expect(await closeOtherSessions(ctx, currentSession)).toBe(1);
    expect(await testDb.session.findUnique({ where: { id: currentSession } })).not.toBeNull();
  });
});
