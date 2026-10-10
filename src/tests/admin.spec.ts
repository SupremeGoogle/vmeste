/**
 * Панель суперадмина: сценарии взлома и ошибок, а не «кнопка работает».
 *
 *  — пароль к почте владельца ≠ владелец (нужен Google);
 *  — подбор кода 2FA упирается в блокировку, код нельзя ввести дважды;
 *  — резервный код срабатывает один раз;
 *  — администратор не трогает владельца и других администраторов;
 *  — заблокированный выпадает из всех сессий сразу;
 *  — «войти как» не открывает панель и возвращает в свою сессию.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, resetDb } from "./helpers/db";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); },
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "vitest" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));

process.env.ADMIN_SECRET = "test-admin-secret-0123456789abcdef0123456789";
process.env.SUPERADMIN_EMAILS = "owner@example.com";

const { base32Encode, currentStep, openSecret, sealSecret, totpAt, verifyTotp, hashBackupCode } = await import("@/server/admin/totp");
const { adminKey } = await import("@/server/admin/config");
const access = await import("@/server/admin/access");
const ops = await import("@/server/admin/operations");
const { getSessionUser } = await import("@/server/auth/session");
const { platformStats, dailySeries, listUsers, listEvents } = await import("@/server/admin/stats");
const { scrubUrl } = await import("@/lib/sentry-scrub");

async function makeUser(email: string, opts: { google?: boolean; verified?: boolean; role?: "ADMIN" | "SUPPORT" } = {}) {
  const org = await testDb.organization.create({ data: { name: email, slug: email.replace(/\W/g, "-") } });
  const user = await testDb.user.create({
    data: {
      email, name: email.split("@")[0], emailVerified: opts.verified ?? Boolean(opts.google), platformRole: opts.role ?? null,
      memberships: { create: { orgId: org.id, role: "OWNER" } },
      ...(opts.google ? { accounts: { create: { provider: "GOOGLE", providerAccountId: `sub-${email}`, email } } } : {}),
    },
  });
  return { user, org };
}

/** Войти: сессия в базе и cookie «телефона». */
async function login(userId: string, adminUntil?: Date) {
  const session = await testDb.session.create({ data: { id: `s-${userId}-${Math.random().toString(36).slice(2)}`, userId, expiresAt: new Date(Date.now() + 86_400_000), adminUntil: adminUntil ?? null } });
  jar.set("vmeste_session", session.id);
  return session.id;
}

/** Включить 2FA и вернуть секрет. */
async function enroll(userId: string) {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  await testDb.adminSecret.create({ data: { userId, totpSecret: sealSecret(secret, adminKey()!), confirmedAt: new Date(), backupCodes: [hashBackupCode("aaaaa-bbbbb")] } });
  return secret;
}

beforeEach(async () => {
  await resetDb();
  await testDb.adminAudit.deleteMany({});
  jar.clear();
});
afterAll(async () => {
  await resetDb();
  await testDb.adminAudit.deleteMany({});
  await testDb.$disconnect();
});

describe("TOTP по RFC 6238", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("время %i → %s", (seconds, code) => {
    expect(totpAt(secret, Math.floor(seconds / 30))).toBe(code);
  });

  it("соседний шаг принимается, старый и повторный — нет", () => {
    const now = 1_700_000_000_000;
    const step = currentStep(now);
    expect(verifyTotp(secret, totpAt(secret, step - 1), 0, now)).toBe(step - 1);
    expect(verifyTotp(secret, totpAt(secret, step), step, now)).toBeNull();
    expect(verifyTotp(secret, totpAt(secret, step - 5), 0, now)).toBeNull();
    expect(verifyTotp(secret, "12345", 0, now)).toBeNull();
    expect(verifyTotp(secret, "abcdef", 0, now)).toBeNull();
  });

  it("секрет зашифрован и не открывается чужим ключом", () => {
    const sealed = sealSecret("JBSWY3DPEHPK3PXP", adminKey()!);
    expect(sealed).not.toContain("JBSWY3DP");
    expect(openSecret(sealed, adminKey()!)).toBe("JBSWY3DPEHPK3PXP");
    expect(openSecret(sealed, Buffer.alloc(32, 1))).toBeNull();
    expect(openSecret(`${sealed.slice(0, -2)}xx`, adminKey()!)).toBeNull();
  });
});

describe("кто владелец", () => {
  it("почта владельца с паролем, без Google — никто", async () => {
    const { user } = await makeUser("owner@example.com", { google: false, verified: false });
    await login(user.id);
    expect(await access.getAdminIdentity()).toBeNull();
  });

  it("почта владельца через Google — владелец, но панель закрыта до кода", async () => {
    const { user } = await makeUser("owner@example.com", { google: true });
    await login(user.id);
    const admin = await access.getAdminIdentity();
    expect(admin).toMatchObject({ role: "OWNER", elevated: false, secondFactorReady: false });
    await expect(access.requireAdmin()).rejects.toThrow("NEXT_REDIRECT /admin/verify");
  });

  it("обычный пользователь не видит панель вовсе (404)", async () => {
    const { user } = await makeUser("someone@example.com", { google: true });
    await login(user.id, new Date(Date.now() + 3600_000));
    await expect(access.requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("выданная роль без Google не действует", async () => {
    const { user } = await makeUser("support@example.com", { google: false, role: "SUPPORT" });
    await login(user.id, new Date(Date.now() + 3600_000));
    expect(await access.getAdminIdentity()).toBeNull();
  });

  it("заблокированный владелец — не владелец", async () => {
    const { user } = await makeUser("owner@example.com", { google: true });
    await testDb.user.update({ where: { id: user.id }, data: { blockedAt: new Date() } });
    await login(user.id);
    expect(await access.getAdminIdentity()).toBeNull();
  });
});

describe("второй фактор", () => {
  it("настройка: код подтверждает её, открывает панель и выдаёт 10 резервных кодов", async () => {
    const { user } = await makeUser("owner@example.com", { google: true });
    await login(user.id);
    const admin = (await access.getAdminIdentity())!;
    const setup = await access.beginSetup(admin);
    if ("error" in setup) throw new Error(setup.error);
    // Повторный показ страницы — тот же секрет (QR уже отсканирован).
    const again = await access.beginSetup(admin);
    expect("secret" in again && again.secret).toBe(setup.secret);
    const result = await access.verifySecondFactor(admin, totpAt(setup.secret, currentStep()));
    expect(result.ok).toBe(true);
    expect(result.ok && result.backupCodes).toHaveLength(10);
    expect((await access.getAdminIdentity())).toMatchObject({ elevated: true, secondFactorReady: true });
    expect((await access.requireAdmin("OWNER")).role).toBe("OWNER");
  });

  it("подбор: пять ошибок — блокировка, даже верный код не проходит", async () => {
    const { user } = await makeUser("owner@example.com", { google: true });
    const secret = await enroll(user.id);
    await login(user.id);
    const admin = (await access.getAdminIdentity())!;
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await access.verifySecondFactor(admin, "000000")).ok).toBe(false);
    }
    const locked = await access.verifySecondFactor(admin, totpAt(secret, currentStep()));
    expect(locked).toMatchObject({ ok: false });
    expect(!locked.ok && locked.message).toMatch(/Слишком много ошибок/);
    expect(await testDb.adminAudit.count({ where: { action: "admin.locked" } })).toBe(1);
  });

  it("код нельзя ввести второй раз, резервный — срабатывает один раз", async () => {
    const { user } = await makeUser("owner@example.com", { google: true });
    const secret = await enroll(user.id);
    await login(user.id);
    const admin = (await access.getAdminIdentity())!;
    const code = totpAt(secret, currentStep());
    expect((await access.verifySecondFactor(admin, code)).ok).toBe(true);
    expect((await access.verifySecondFactor(admin, code)).ok).toBe(false);
    expect((await access.verifySecondFactor(admin, "AAAAA-BBBBB")).ok).toBe(true);
    expect((await access.verifySecondFactor(admin, "aaaaa-bbbbb")).ok).toBe(false);
  });

  it("параллельные попытки: счётчик не теряет ошибки, код и резервный код проходят ровно раз", async () => {
    const { user } = await makeUser("owner@example.com", { google: true });
    const secret = await enroll(user.id);
    await login(user.id);
    const admin = (await access.getAdminIdentity())!;

    // Двадцать неверных кодов разом: раньше все читали failedCount = 0,
    // и блокировка не наступала.
    await Promise.all(Array.from({ length: 20 }, () => access.verifySecondFactor(admin, "000000")));
    expect((await testDb.adminSecret.findUniqueOrThrow({ where: { userId: user.id } })).lockedUntil).not.toBeNull();
    await testDb.adminSecret.update({ where: { userId: user.id }, data: { lockedUntil: null, failedCount: 0 } });

    const code = totpAt(secret, currentStep());
    const totp = await Promise.all(Array.from({ length: 5 }, () => access.verifySecondFactor(admin, code)));
    expect(totp.filter((result) => result.ok)).toHaveLength(1);

    const backup = await Promise.all(Array.from({ length: 5 }, () => access.verifySecondFactor(admin, "AAAAA-BBBBB")));
    expect(backup.filter((result) => result.ok)).toHaveLength(1);
  });

  it("панель живёт ограниченное время", async () => {
    const { user } = await makeUser("owner@example.com", { google: true });
    await enroll(user.id);
    await login(user.id, new Date(Date.now() - 1000));
    await expect(access.requireAdmin()).rejects.toThrow("NEXT_REDIRECT /admin/verify");
  });
});

describe("права администраторов", () => {
  async function elevated(email: string, role?: "ADMIN" | "SUPPORT") {
    const { user } = await makeUser(email, { google: true, role });
    await enroll(user.id);
    await login(user.id, new Date(Date.now() + 3600_000));
    return access.requireAdmin();
  }

  it("администратор не трогает владельца и других администраторов, поддержка — никого", async () => {
    const { user: owner } = await makeUser("owner@example.com", { google: true });
    const { user: other } = await makeUser("other-admin@example.com", { google: true, role: "ADMIN" });
    const { user: plain } = await makeUser("plain@example.com", { google: true });
    const admin = await elevated("admin@example.com", "ADMIN");
    expect((await ops.blockUser(admin, owner.id, "x")).ok).toBe(false);
    expect((await ops.blockUser(admin, other.id, "x")).ok).toBe(false);
    expect((await ops.setPlatformRole(admin, plain.id, "ADMIN")).ok).toBe(false);
    expect((await ops.deleteUser(admin, plain.id, "plain@example.com")).ok).toBe(false);
    expect((await ops.blockUser(admin, admin.userId, "x")).ok).toBe(false);
    expect((await ops.blockUser(admin, plain.id, "спам")).ok).toBe(true);

    const support = await elevated("support@example.com", "SUPPORT");
    expect((await ops.unblockUser(support, plain.id)).ok).toBe(false);
    expect((await ops.impersonate(support, plain.id)).ok).toBe(false);
  });

  it("блокировка выкидывает из всех сессий и не пускает обратно", async () => {
    const { user: victim } = await makeUser("victim@example.com", { google: true });
    const phone = await login(victim.id);
    expect(await getSessionUser()).not.toBeNull();
    const owner = await elevated("owner@example.com");
    expect((await ops.blockUser(owner, victim.id, "мошенник")).ok).toBe(true);
    jar.set("vmeste_session", phone);
    expect(await getSessionUser()).toBeNull();
    expect(await testDb.session.count({ where: { userId: victim.id } })).toBe(0);
  });

  it("права выдаются только учётке Google, снятие прав закрывает её панель", async () => {
    const { user: passwordUser } = await makeUser("pass@example.com", { google: false });
    const { user: googleUser } = await makeUser("helper@example.com", { google: true });
    const owner = await elevated("owner@example.com");
    expect((await ops.setPlatformRole(owner, passwordUser.id, "ADMIN")).ok).toBe(false);
    expect((await ops.setPlatformRole(owner, googleUser.id, "SUPPORT")).ok).toBe(true);
    await testDb.session.create({ data: { id: "helper-session", userId: googleUser.id, expiresAt: new Date(Date.now() + 86_400_000), adminUntil: new Date(Date.now() + 3600_000) } });
    expect((await ops.setPlatformRole(owner, googleUser.id, null)).ok).toBe(true);
    expect((await testDb.session.findUnique({ where: { id: "helper-session" } }))?.adminUntil).toBeNull();
  });

  it("удаление: только с точной почтой, уносит одиночные организации", async () => {
    const { user, org } = await makeUser("gone@example.com", { google: true });
    await testDb.event.create({ data: { orgId: org.id, title: "Свадьба", slug: "gone", shortCode: "GONE01", eventDate: new Date() } });
    const owner = await elevated("owner@example.com");
    expect((await ops.deleteUser(owner, user.id, "wrong@example.com")).ok).toBe(false);
    expect((await ops.deleteUser(owner, user.id, "GONE@example.com")).ok).toBe(true);
    expect(await testDb.user.count({ where: { id: user.id } })).toBe(0);
    expect(await testDb.organization.count({ where: { id: org.id } })).toBe(0);
    expect(await testDb.adminAudit.count({ where: { action: "user.delete" } })).toBe(1);
  });

  it("«войти как»: панель в чужой сессии закрыта, возврат — в свою", async () => {
    const { user: client } = await makeUser("client@example.com", { google: true });
    const owner = await elevated("owner@example.com");
    const ownSession = jar.get("vmeste_session");
    expect((await ops.impersonate(owner, client.id)).ok).toBe(true);
    const viewed = await getSessionUser();
    expect(viewed).toMatchObject({ email: "client@example.com", impersonatedBy: { email: "owner@example.com" } });
    expect(await access.getAdminIdentity()).toBeNull();
    expect(await ops.endImpersonation()).toBe(true);
    expect(jar.get("vmeste_session")).toBe(ownSession);
    expect((await access.requireAdmin()).role).toBe("OWNER");
  });
});

describe("статистика и приватность", () => {
  it("сводные запросы считаются по всей платформе", async () => {
    const { org } = await makeUser("stats@example.com", { google: true });
    const event = await testDb.event.create({ data: { orgId: org.id, title: "Свадьба", slug: "stats", shortCode: "STAT01", eventDate: new Date(Date.now() + 86_400_000), status: "PUBLISHED" } });
    await testDb.guest.create({ data: { orgId: org.id, eventId: event.id, displayName: "Гость", searchKey: "гость", linkToken: "stats-token-1", rsvpStatus: "ACCEPTED", rsvpAt: new Date() } });
    const stats = await platformStats();
    expect(stats.users.total).toBe(1);
    expect(stats.events).toMatchObject({ total: 1, published: 1, upcoming30: 1 });
    expect(stats.guests).toMatchObject({ total: 1, accepted: 1 });
    const series = await dailySeries(7);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toMatchObject({ users: 1, events: 1, rsvps: 1 });
    expect((await listUsers("STATS"))[0]).toMatchObject({ email: "stats@example.com", events: 1, guests: 1, google: true });
    expect(await listUsers("100%_")).toHaveLength(0);
    expect((await listEvents("свадь"))[0]).toMatchObject({ slug: "stats", guests: 1, accepted: 1 });
  });

  it("токены гостей не уходят в Sentry", () => {
    expect(scrubUrl("https://site.ru/i/anya-misha/AbCdEf123456?ok=1")).toBe("https://site.ru/i/anya-misha/[token]?ok=1");
    expect(scrubUrl("/i/anya-misha/AbCdEf123456/rsvp")).toBe("/i/anya-misha/[token]/rsvp");
    expect(scrubUrl("/i/anya-misha/wishlist?gift=x&gsig=secret")).toBe("/i/anya-misha/[token]?gift=x&gsig=[filtered]");
    expect(scrubUrl("/screen/9f8e7d6c5b4a")).toBe("/screen/[token]");
  });
});
