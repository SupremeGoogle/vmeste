/**
 * Регистрация по почте: подтверждение, сброс пароля, одноразовость ссылок
 * и защита от захвата чужого адреса. Письма перехватываются моком.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, resetDb } from "./helpers/db";

const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/server/email/send", () => ({
  emailConfigured: () => true,
  sendEmail: vi.fn(async (email: { to: string; subject: string; text: string }) => { sent.push(email); return true; }),
}));
vi.mock("@/server/notify/events", () => ({ notifySignup: () => {}, notifyOnce: () => {} }));

const auth = await import("@/server/services/email-auth");
const { verifyPassword } = await import("@/server/auth/password");
const { userForGoogleProfile } = await import("@/server/services/signup");

const tokenFrom = (text: string) => decodeURIComponent(/token=([A-Za-z0-9_%-]+)/.exec(text)?.[1] ?? "");
const lastLink = () => tokenFrom(sent[sent.length - 1].text);

beforeEach(async () => {
  sent.length = 0;
  await resetDb();
});

describe("регистрация по почте", () => {
  it("заводит неподтверждённый кабинет и шлёт ссылку; ссылка подтверждает один раз", async () => {
    expect(await auth.registerWithEmail({ name: "Анна", email: "Anna@Example.com ", password: "svadba2026!" })).toEqual({ ok: true });
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    expect(user.emailVerified).toBe(false);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("Подтвердите почту");

    const token = lastLink();
    expect(await auth.confirmEmail(token)).toBe(user.id);
    expect((await testDb.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(true);
    expect(await auth.confirmEmail(token)).toBeNull();
  });

  it("плохие данные не заводят кабинет", async () => {
    expect(await auth.registerWithEmail({ name: "А", email: "a@b.ru", password: "svadba2026!" })).toEqual({ ok: false, code: "name" });
    expect(await auth.registerWithEmail({ name: "Анна", email: "не почта", password: "svadba2026!" })).toEqual({ ok: false, code: "email" });
    expect(await auth.registerWithEmail({ name: "Анна", email: "a@b.ru", password: "short" })).toEqual({ ok: false, code: "password_short" });
    expect(await auth.registerWithEmail({ name: "Анна", email: "a@b.ru", password: "12345678" })).toEqual({ ok: false, code: "password_weak" });
    expect(await testDb.user.count()).toBe(0);
  });

  it("занятый подтверждённый адрес: пароль не меняется, хозяину — письмо «кабинет уже есть»", async () => {
    await auth.registerWithEmail({ name: "Анна", email: "anna@example.com", password: "svadba2026!" });
    await auth.confirmEmail(lastLink());
    expect(await auth.registerWithEmail({ name: "Взломщик", email: "anna@example.com", password: "hacker-pass-1" })).toEqual({ ok: true });
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    expect(await verifyPassword("svadba2026!", user.passwordHash)).toBe(true);
    expect(user.name).toBe("Анна");
    expect(sent[sent.length - 1].subject).toContain("уже есть кабинет");
  });

  it("повторная регистрация неподтверждённого адреса перезаписывает её, старая ссылка гаснет", async () => {
    await auth.registerWithEmail({ name: "Чужой", email: "olga@example.com", password: "first-pass-1" });
    const first = lastLink();
    await auth.registerWithEmail({ name: "Ольга", email: "olga@example.com", password: "olga-pass-2" });
    expect(await auth.confirmEmail(first)).toBeNull();
    const id = await auth.confirmEmail(lastLink());
    const user = await testDb.user.findUniqueOrThrow({ where: { id: id! } });
    expect(user.name).toBe("Ольга");
    expect(await verifyPassword("olga-pass-2", user.passwordHash)).toBe(true);
  });

  it("ссылка, выданная на прежний адрес, не годится после смены почты", async () => {
    await auth.registerWithEmail({ name: "Анна", email: "anna@example.com", password: "svadba2026!" });
    const token = lastLink();
    await testDb.user.update({ where: { email: "anna@example.com" }, data: { email: "new@example.com" } });
    expect(await auth.confirmEmail(token)).toBeNull();
  });

  it("просроченная ссылка не работает", async () => {
    await auth.registerWithEmail({ name: "Анна", email: "anna@example.com", password: "svadba2026!" });
    await testDb.emailToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await auth.confirmEmail(lastLink())).toBeNull();
  });
});

describe("сброс пароля", () => {
  it("меняет пароль, подтверждает почту, гасит сессии; ссылка одноразовая", async () => {
    await auth.registerWithEmail({ name: "Анна", email: "anna@example.com", password: "svadba2026!" });
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    await testDb.session.create({ data: { id: "old-session", userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) } });

    await auth.requestPasswordReset("ANNA@example.com");
    const token = lastLink();
    expect(await auth.resetPasswordWithToken(token, "short")).toEqual({ ok: false, code: "password_short" });
    expect(await auth.resetPasswordWithToken(token, "new-pass-2026")).toEqual({ ok: true, userId: user.id });

    const after = await testDb.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("new-pass-2026", after.passwordHash)).toBe(true);
    expect(after.emailVerified).toBe(true);
    expect(await testDb.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await auth.resetPasswordWithToken(token, "again-pass-2026")).toEqual({ ok: false, code: "link" });
  });

  it("неизвестный адрес — тишина, письма нет", async () => {
    await auth.requestPasswordReset("nobody@example.com");
    expect(sent).toHaveLength(0);
  });

  it("ссылка подтверждения не годится для сброса пароля, и наоборот", async () => {
    await auth.registerWithEmail({ name: "Анна", email: "anna@example.com", password: "svadba2026!" });
    const verify = lastLink();
    expect(await auth.resetPasswordWithToken(verify, "new-pass-2026")).toEqual({ ok: false, code: "link" });
    expect(await auth.confirmEmail(verify)).not.toBeNull();
  });
});

describe("в базе только хеши ссылок", () => {
  it("сам токен нигде не хранится", async () => {
    await auth.registerWithEmail({ name: "Анна", email: "anna@example.com", password: "svadba2026!" });
    const token = lastLink();
    const rows = await testDb.emailToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toContain(token);
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("захват чужой почты через регистрацию", () => {
  const profile = { sub: "google-123", email: "victim@example.com", name: "Хозяйка", picture: undefined } as unknown as Parameters<typeof userForGoogleProfile>[0];

  it("Google-вход в неподтверждённый кабинет стирает чужой пароль и сессии", async () => {
    await auth.registerWithEmail({ name: "Взломщик", email: "victim@example.com", password: "attacker-pass-1" });
    const before = await testDb.user.findUniqueOrThrow({ where: { email: "victim@example.com" } });
    await testDb.session.create({ data: { id: "attacker-session", userId: before.id, expiresAt: new Date(Date.now() + 86_400_000) } });
    const pending = lastLink();

    const userId = await userForGoogleProfile(profile);
    expect(userId).toBe(before.id);
    const after = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.passwordHash).toBeNull();
    expect(after.emailVerified).toBe(true);
    expect(await testDb.session.count({ where: { userId } })).toBe(0);
    // Ссылка из письма взломщику тоже больше не работает.
    expect(await auth.confirmEmail(pending)).toBeNull();
  });

  it("подтверждённый кабинет при Google-входе сохраняет свой пароль", async () => {
    await auth.registerWithEmail({ name: "Хозяйка", email: "victim@example.com", password: "owner-pass-2026" });
    await auth.confirmEmail(lastLink());
    const userId = await userForGoogleProfile(profile);
    const after = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword("owner-pass-2026", after.passwordHash)).toBe(true);
  });
});
