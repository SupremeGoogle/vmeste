/**
 * Регистрация по почте: код подтверждения (5 попыток, 15 минут), сброс
 * пароля, одноразовость и защита от захвата чужого адреса. Письма
 * перехватываются моком.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, resetDb } from "./helpers/db";

const sent: { to: string; subject: string; text: string; html: string }[] = [];
vi.mock("@/server/email/send", () => ({
  emailConfigured: () => true,
  sendEmail: vi.fn(async (email: { to: string; subject: string; text: string; html: string }) => { sent.push(email); return true; }),
}));
vi.mock("@/server/notify/events", () => ({ notifySignup: () => {}, notifyOnce: () => {} }));

const auth = await import("@/server/services/email-auth");
const { verifyPassword } = await import("@/server/auth/password");
const { userForGoogleProfile } = await import("@/server/services/signup");

const lastCode = () => /\b(\d{6})\b/.exec(sent[sent.length - 1].text)?.[1] ?? "";
const lastLink = () => decodeURIComponent(/token=([A-Za-z0-9_%-]+)/.exec(sent[sent.length - 1].text)?.[1] ?? "");
const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

beforeEach(async () => {
  sent.length = 0;
  await resetDb();
});

describe("регистрация по почте", () => {
  it("без имени: кабинет заводится, имя берётся из адреса, приходит код без ссылок", async () => {
    expect(await auth.registerWithEmail({ email: "Anna.Petrova@Example.com ", password: "svadba2026!" })).toEqual({ ok: true });
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "anna.petrova@example.com" } });
    expect(user.emailVerified).toBe(false);
    expect(user.name).toBe("Anna Petrova");
    expect(sent).toHaveLength(1);
    expect(lastCode()).toMatch(/^\d{6}$/);
    expect(sent[0].subject).toContain("код подтверждения");
    // Ни ссылок, ни кнопок — так письмо реже попадает в спам.
    expect(sent[0].html).not.toMatch(/<a\s|href=/i);
    expect(sent[0].text).not.toMatch(/https?:\/\//);
  });

  it("код подтверждает почту один раз; с пробелом тоже принимается", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    const code = lastCode();
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    expect(await auth.confirmEmailCode("ANNA@example.com", `${code.slice(0, 3)} ${code.slice(3)}`)).toEqual({ ok: true, userId: user.id });
    expect((await testDb.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(true);
    expect((await auth.confirmEmailCode("anna@example.com", code)).ok).toBe(false);
  });

  it("неверный код тратит попытку; после пятой код сгорает даже верный", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    const code = lastCode();
    expect(await auth.confirmEmailCode("anna@example.com", wrong(code))).toEqual({ ok: false, code: "code_wrong", left: 4 });
    for (let i = 0; i < 3; i++) await auth.confirmEmailCode("anna@example.com", wrong(code));
    expect(await auth.confirmEmailCode("anna@example.com", wrong(code))).toEqual({ ok: false, code: "code_attempts" });
    expect(await auth.confirmEmailCode("anna@example.com", code)).toEqual({ ok: false, code: "code_attempts" });
  });

  it("параллельный перебор не получает лишних попыток", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    const code = lastCode();
    await Promise.all(Array.from({ length: 20 }, () => auth.confirmEmailCode("anna@example.com", wrong(code))));
    const row = await testDb.emailToken.findFirstOrThrow({ where: { purpose: "VERIFY" } });
    expect(row.attempts).toBeLessThanOrEqual(auth.CODE_ATTEMPTS);
    expect(await auth.confirmEmailCode("anna@example.com", code)).toEqual({ ok: false, code: "code_attempts" });
  });

  it("новый код гасит прежний; просроченный не работает", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    const first = lastCode();
    await auth.resendVerification("anna@example.com");
    const second = lastCode();
    if (first !== second) expect((await auth.confirmEmailCode("anna@example.com", first)).ok).toBe(false);
    await testDb.emailToken.updateMany({ where: { usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await auth.confirmEmailCode("anna@example.com", second)).toEqual({ ok: false, code: "code_expired" });
  });

  it("плохие данные не заводят кабинет", async () => {
    expect(await auth.registerWithEmail({ email: "не почта", password: "svadba2026!" })).toEqual({ ok: false, code: "email" });
    expect(await auth.registerWithEmail({ email: "a@b.ru", password: "short" })).toEqual({ ok: false, code: "password_short" });
    expect(await auth.registerWithEmail({ email: "a@b.ru", password: "12345678" })).toEqual({ ok: false, code: "password_weak" });
    expect(await testDb.user.count()).toBe(0);
  });

  it("занятый подтверждённый адрес: пароль не меняется, хозяину — письмо «кабинет уже есть»", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    await auth.confirmEmailCode("anna@example.com", lastCode());
    expect(await auth.registerWithEmail({ email: "anna@example.com", password: "hacker-pass-1" })).toEqual({ ok: true });
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    expect(await verifyPassword("svadba2026!", user.passwordHash)).toBe(true);
    expect(sent[sent.length - 1].subject).toContain("уже есть кабинет");
  });

  it("повторная регистрация неподтверждённого адреса перезаписывает пароль, прежний код гаснет", async () => {
    await auth.registerWithEmail({ email: "olga@example.com", password: "first-pass-1" });
    const first = lastCode();
    await auth.registerWithEmail({ email: "olga@example.com", password: "olga-pass-2" });
    const second = lastCode();
    if (first !== second) expect((await auth.confirmEmailCode("olga@example.com", first)).ok).toBe(false);
    const result = await auth.confirmEmailCode("olga@example.com", second);
    expect(result.ok).toBe(true);
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "olga@example.com" } });
    expect(await verifyPassword("olga-pass-2", user.passwordHash)).toBe(true);
  });

  it("код, выданный на прежний адрес, не годится после смены почты", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    const code = lastCode();
    await testDb.user.update({ where: { email: "anna@example.com" }, data: { email: "new@example.com" } });
    expect((await auth.confirmEmailCode("new@example.com", code)).ok).toBe(false);
  });

  it("имя из адреса: точки и дефисы — пробелы, цифры отбрасываются", () => {
    expect(auth.nameFromEmail("ivan_petrov@mail.ru")).toBe("Ivan Petrov");
    expect(auth.nameFromEmail("123@mail.ru")).toBe("Организатор");
  });
});

describe("сброс пароля", () => {
  it("меняет пароль, подтверждает почту, гасит сессии; ссылка одноразовая", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
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

  it("код подтверждения не годится как ссылка сброса", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    expect(await auth.resetPasswordWithToken(lastCode(), "new-pass-2026")).toEqual({ ok: false, code: "link" });
  });
});

describe("в базе только хеши", () => {
  it("сам код нигде не хранится", async () => {
    await auth.registerWithEmail({ email: "anna@example.com", password: "svadba2026!" });
    const rows = await testDb.emailToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toContain(lastCode());
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("захват чужой почты через регистрацию", () => {
  const profile = { sub: "google-123", email: "victim@example.com", name: "Хозяйка", picture: undefined } as unknown as Parameters<typeof userForGoogleProfile>[0];

  it("Google-вход в неподтверждённый кабинет стирает чужой пароль, сессии и код", async () => {
    await auth.registerWithEmail({ email: "victim@example.com", password: "attacker-pass-1" });
    const before = await testDb.user.findUniqueOrThrow({ where: { email: "victim@example.com" } });
    await testDb.session.create({ data: { id: "attacker-session", userId: before.id, expiresAt: new Date(Date.now() + 86_400_000) } });
    const pending = lastCode();

    const userId = await userForGoogleProfile(profile);
    expect(userId).toBe(before.id);
    const after = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.passwordHash).toBeNull();
    expect(after.emailVerified).toBe(true);
    expect(await testDb.session.count({ where: { userId } })).toBe(0);
    expect((await auth.confirmEmailCode("victim@example.com", pending)).ok).toBe(false);
  });

  it("подтверждённый кабинет при Google-входе сохраняет свой пароль", async () => {
    await auth.registerWithEmail({ email: "victim@example.com", password: "owner-pass-2026" });
    await auth.confirmEmailCode("victim@example.com", lastCode());
    const userId = await userForGoogleProfile(profile);
    const after = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword("owner-pass-2026", after.passwordHash)).toBe(true);
  });
});
