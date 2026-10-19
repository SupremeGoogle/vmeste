/**
 * Оплата, кабинет без регистрации и подписка — сценарии взлома и ошибок:
 *
 *  — подпись Robokassa: верная проходит, подделка, чужая сумма и
 *    лишние Shp_-поля — нет; повтор уведомления ничего не меняет;
 *  — неоплаченная свадьба не открывается гостям ни одним путём и не
 *    публикуется;
 *  — черновик без регистрации переезжает в настоящий кабинет целиком;
 *  — подписку выдаёт только владелец, только со свежим кодом 2FA и не себе.
 */
import { createHash } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, resetDb } from "./helpers/db";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    has: (name: string) => jar.has(name),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); },
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9", "user-agent": "vitest" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));

process.env.ROBOKASSA_LOGIN = "vmeste-test";
process.env.ROBOKASSA_PASSWORD1 = "pass-one";
process.env.ROBOKASSA_PASSWORD2 = "pass-two";
process.env.ROBOKASSA_HASH = "sha256";
process.env.ADMIN_SECRET = "test-admin-secret-0123456789abcdef0123456789";
process.env.SUPERADMIN_EMAILS = "owner@example.com";

const robokassa = await import("@/server/payments/robokassa");
const billing = await import("@/server/billing");
const { findGuestByLinkToken } = await import("@/server/repositories/guests");
const { findEventByShortCode, setEventStatus, createEvent } = await import("@/server/repositories/events");
const { identifyByEventSession } = await import("@/server/guest-access/identify");
const { teamPlanAccess } = await import("@/server/services/day-plan");
const { accessByScreenToken } = await import("@/server/services/screen");
const workspace = await import("@/server/services/guest-workspace");
const { createSession, getSessionUser, rememberAfterAuth, takeAfterAuth, safeAppPath } = await import("@/server/auth/session");
const { base32Encode, sealSecret, totpAt, currentStep } = await import("@/server/admin/totp");
const { adminKey } = await import("@/server/admin/config");
const access = await import("@/server/admin/access");
const { grantSubscription, revokeSubscription } = await import("@/server/admin/subscription");

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const config = robokassa.robokassaConfig()!;

async function wedding(tag: string, opts: { paid?: boolean } = {}) {
  const org = await testDb.organization.create({ data: { name: tag, slug: `org-${tag}` } });
  const user = await testDb.user.create({
    data: { email: `${tag}@example.com`, name: tag, emailVerified: true, memberships: { create: { orgId: org.id, role: "OWNER" } } },
  });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${tag}`, slug: `s-${tag}`, shortCode: tag.toUpperCase().padEnd(6, "X").slice(0, 6),
      eventDate: new Date(Date.now() + 30 * 86_400_000), paidAt: opts.paid ? new Date() : null,
      teamPlanToken: tag.padEnd(32, "t").slice(0, 32),
    },
  });
  const guest = await testDb.guest.create({
    data: { orgId: org.id, eventId: event.id, displayName: "Анна", searchKey: "анна", linkToken: `tok-${tag}-0123456789abcdef` },
  });
  const screen = await testDb.screenToken.create({ data: { orgId: org.id, eventId: event.id, token: `screen-${tag}-0123456789abcdef` } });
  const ctx = { kind: "org" as const, userId: user.id, orgId: org.id, role: "OWNER" as const, eventId: event.id };
  return { org, user, event, guest, screen, ctx };
}

function notice(invId: number, outSum: string, password = "pass-two") {
  return new URLSearchParams({ OutSum: outSum, InvId: String(invId), SignatureValue: sha(`${outSum}:${invId}:${password}`) });
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

describe("подпись Robokassa", () => {
  it("ссылка на оплату подписана MerchantLogin:OutSum:InvId:Пароль#1", () => {
    const url = new URL(robokassa.paymentUrl(config, { invId: 1001, kopecks: 149_000, description: "Свадьба, счёт 1001" }));
    expect(url.origin + url.pathname).toBe("https://auth.robokassa.ru/Merchant/Index.aspx");
    expect(url.searchParams.get("OutSum")).toBe("1490.00");
    expect(url.searchParams.get("SignatureValue")).toBe(sha("vmeste-test:1490.00:1001:pass-one"));
    expect(url.searchParams.get("IsTest")).toBeNull();
  });

  it("уведомление с верной подписью паролем №2 проходит, регистр не важен", () => {
    const params = notice(1001, "1490.000000");
    params.set("SignatureValue", params.get("SignatureValue")!.toUpperCase());
    expect(robokassa.verifyResultNotice(config, params)).toEqual({ invId: 1001, kopecks: 149_000, outSumRaw: "1490.000000" });
  });

  it("подделка не проходит: пароль №1 вместо №2, другая сумма, лишнее Shp_-поле, мусор в номере", () => {
    expect(robokassa.verifyResultNotice(config, notice(1001, "1490.00", "pass-one"))).toBeNull();
    const tampered = notice(1001, "1490.00");
    tampered.set("OutSum", "1.00");
    expect(robokassa.verifyResultNotice(config, tampered)).toBeNull();
    const extra = notice(1001, "1490.00");
    extra.set("Shp_event", "x");
    expect(robokassa.verifyResultNotice(config, extra)).toBeNull();
    expect(robokassa.verifyResultNotice(config, new URLSearchParams({ OutSum: "1490", InvId: "1;drop", SignatureValue: "x" }))).toBeNull();
  });
});

describe("оплата свадьбы", () => {
  it("кабинет без регистрации счёт не получает", async () => {
    const { ctx, user } = await wedding("anonpay");
    await testDb.user.update({ where: { id: user.id }, data: { isAnonymous: true } });
    expect(await billing.startPayment(ctx)).toEqual({ ok: false, reason: "anonymous" });
  });

  it("сумма из кода; неверная сумма не открывает, верная — открывает, повтор — ничего", async () => {
    const { ctx, event } = await wedding("pay");
    expect((await billing.startPayment(ctx)).ok).toBe(true);
    const payment = await testDb.payment.findFirstOrThrow({ where: { eventId: event.id } });
    expect(payment.amount).toBe(149_000);
    expect(payment.status).toBe("PENDING");

    expect(await billing.confirmPayment(payment.invId, 100, {})).toBe("amount");
    expect((await testDb.event.findUniqueOrThrow({ where: { id: event.id } })).paidAt).toBeNull();

    expect(await billing.confirmPayment(payment.invId, 149_000, { source: "test" })).toBe("paid");
    expect((await testDb.event.findUniqueOrThrow({ where: { id: event.id } })).paidAt).not.toBeNull();
    expect(await billing.confirmPayment(payment.invId, 149_000, {})).toBe("already");
    expect(await billing.confirmPayment(999_999, 149_000, {})).toBe("unknown");
    expect(await billing.startPayment(ctx)).toEqual({ ok: false, reason: "paid" });
  });

  it("тестовая цена — только владельцу и только меньше обычной", async () => {
    process.env.PAYMENT_TEST_PRICE_RUB = "50";
    try {
      expect(billing.priceKopecksFor("owner@example.com")).toBe(5_000);
      expect(billing.priceKopecksFor("Owner@Example.com")).toBe(5_000);
      expect(billing.priceKopecksFor("client@example.com")).toBe(149_000);
      process.env.PAYMENT_TEST_PRICE_RUB = "5000";
      expect(billing.priceKopecksFor("owner@example.com")).toBe(149_000);
      process.env.PAYMENT_TEST_PRICE_RUB = "1; drop";
      expect(billing.priceKopecksFor("owner@example.com")).toBe(149_000);

      process.env.PAYMENT_TEST_PRICE_RUB = "50";
      const { ctx, event } = await wedding("testprice");
      await testDb.user.update({ where: { id: ctx.userId }, data: { email: "owner@example.com" } });
      const started = await billing.startPayment(ctx);
      expect(started.ok && new URL(started.url).searchParams.get("OutSum")).toBe("50.00");
      const payment = await testDb.payment.findFirstOrThrow({ where: { eventId: event.id } });
      expect(payment.amount).toBe(5_000);
      expect(await billing.confirmPayment(payment.invId, 149_000, {})).toBe("amount");
      expect(await billing.confirmPayment(payment.invId, 5_000, {})).toBe("paid");
    } finally {
      delete process.env.PAYMENT_TEST_PRICE_RUB;
    }
  });

  it("ResultURL: подделка — 400 и свадьба закрыта, верное уведомление — OK{InvId}", async () => {
    const { ctx, event } = await wedding("route");
    await billing.startPayment(ctx);
    const { invId } = await testDb.payment.findFirstOrThrow({ where: { eventId: event.id } });
    const { POST } = await import("@/app/api/pay/robokassa/result/route");
    const post = (params: URLSearchParams) => POST(new Request("http://localhost/api/pay/robokassa/result", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params.toString(),
    }));

    expect((await post(notice(invId, "1490.000000", "guess"))).status).toBe(400);
    expect((await testDb.event.findUniqueOrThrow({ where: { id: event.id } })).paidAt).toBeNull();

    expect(await (await post(notice(invId, "1490.000000"))).text()).toBe(`OK${invId}`);
    expect((await testDb.event.findUniqueOrThrow({ where: { id: event.id } })).paidAt).not.toBeNull();
  });
});

describe("неоплаченная свадьба закрыта для гостей", () => {
  it("именная ссылка, QR, cookie гостя, командная ссылка и экран молчат до оплаты", async () => {
    const { event, guest, screen } = await wedding("closed");
    expect(await findGuestByLinkToken(guest.linkToken)).toBeNull();
    expect(await findEventByShortCode(event.shortCode)).toBeNull();
    expect(await identifyByEventSession(event.id)).toBeNull();
    expect(await teamPlanAccess(event.teamPlanToken!)).toBeNull();
    expect(await accessByScreenToken(screen.token)).toBeNull();

    await testDb.event.update({ where: { id: event.id }, data: { paidAt: new Date() } });
    expect((await findGuestByLinkToken(guest.linkToken))?.id).toBe(guest.id);
    expect((await findEventByShortCode(event.shortCode))?.id).toBe(event.id);
    expect(await teamPlanAccess(event.teamPlanToken!)).not.toBeNull();
    expect(await accessByScreenToken(screen.token)).not.toBeNull();
  });

  it("опубликовать неоплаченную нельзя даже прямым вызовом", async () => {
    const { ctx, event } = await wedding("nopub");
    expect(await setEventStatus(ctx, event.id, "PUBLISHED")).toBe(false);
    expect((await testDb.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe("DRAFT");
  });
});

describe("кабинет без регистрации", () => {
  it("свадьба переезжает в настоящий кабинет при входе, анонимная строка удаляется", async () => {
    const anonId = await workspace.createGuestWorkspace();
    const anonOrg = (await testDb.membership.findFirstOrThrow({ where: { userId: anonId } })).orgId;
    const event = await testDb.event.create({ data: { orgId: anonOrg, title: "Черновик", slug: "draft-anon", shortCode: "ANON01", eventDate: new Date() } });
    const guest = await testDb.guest.create({ data: { orgId: anonOrg, eventId: event.id, displayName: "Пётр", searchKey: "пётр", linkToken: "tok-anon-0123456789abcdef" } });
    const table = await testDb.seatTable.create({ data: { orgId: anonOrg, eventId: event.id, label: "1", x: 0, y: 0 } });

    await testDb.session.create({ data: { id: "anon-session", userId: anonId, expiresAt: new Date(Date.now() + 86_400_000) } });
    jar.set("vmeste_session", "anon-session");
    expect((await getSessionUser())?.isAnonymous).toBe(true);

    const real = await wedding("real");
    await createSession(real.user.id);

    expect((await testDb.event.findUniqueOrThrow({ where: { id: event.id } })).orgId).toBe(real.org.id);
    expect((await testDb.guest.findUniqueOrThrow({ where: { id: guest.id } })).orgId).toBe(real.org.id);
    expect((await testDb.seatTable.findUniqueOrThrow({ where: { id: table.id } })).orgId).toBe(real.org.id);
    expect(await testDb.user.findUnique({ where: { id: anonId } })).toBeNull();
    expect(await testDb.organization.findUnique({ where: { id: anonOrg } })).toBeNull();
    expect((await getSessionUser())?.id).toBe(real.user.id);
  });

  it("настоящий кабинет не «поглощается» как анонимный", async () => {
    const a = await wedding("aaa");
    const b = await wedding("bbb");
    expect(await workspace.adoptGuestWorkspace(a.user.id, b.user.id)).toBe(0);
    expect(await testDb.user.findUnique({ where: { id: a.user.id } })).not.toBeNull();
    expect((await testDb.event.findUniqueOrThrow({ where: { id: a.event.id } })).orgId).toBe(a.org.id);
  });

  it("письма на адрес-заглушку не уходят", async () => {
    const { sendEmail } = await import("@/server/email/send");
    expect(await sendEmail({ to: `guest-x@${workspace.GUEST_EMAIL_DOMAIN}`, subject: "x", html: "x", text: "x" })).toBe(false);
  });

  it("после входа — только адреса кабинета, не чужой сайт", async () => {
    expect(safeAppPath("/app/e/abc/pay")).toBe("/app/e/abc/pay");
    expect(safeAppPath("https://evil.example")).toBeNull();
    expect(safeAppPath("//evil.example/app")).toBeNull();
    expect(safeAppPath("/app//evil.example")).toBeNull();
    expect(safeAppPath("/admin")).toBeNull();
    await rememberAfterAuth("/app/e/abc/pay");
    expect(await takeAfterAuth()).toBe("/app/e/abc/pay");
    expect(await takeAfterAuth()).toBe("/app");
  });

  it("брошенные пустые кабинеты убираются, живой с сессией — нет", async () => {
    const stale = await workspace.createGuestWorkspace();
    await testDb.user.update({ where: { id: stale }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000) } });
    const alive = await workspace.createGuestWorkspace();
    const aliveOrg = (await testDb.membership.findFirstOrThrow({ where: { userId: alive } })).orgId;
    await testDb.event.create({ data: { orgId: aliveOrg, title: "Живой", slug: "alive", shortCode: "ALIVE1", eventDate: new Date() } });
    await testDb.user.update({ where: { id: alive }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000) } });
    await testDb.session.create({ data: { id: "alive-s", userId: alive, expiresAt: new Date(Date.now() + 86_400_000) } });

    expect(await workspace.purgeAbandonedGuestWorkspaces()).toBe(1);
    expect(await testDb.user.findUnique({ where: { id: stale } })).toBeNull();
    expect(await testDb.user.findUnique({ where: { id: alive } })).not.toBeNull();
  });
});

describe("подписка от владельца", () => {
  async function owner() {
    const org = await testDb.organization.create({ data: { name: "owner", slug: "owner-org" } });
    const user = await testDb.user.create({
      data: {
        email: "owner@example.com", name: "Owner", emailVerified: true,
        memberships: { create: { orgId: org.id, role: "OWNER" } },
        accounts: { create: { provider: "GOOGLE", providerAccountId: "sub-owner", email: "owner@example.com" } },
      },
    });
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    await testDb.adminSecret.create({ data: { userId: user.id, totpSecret: sealSecret(secret, adminKey()!), confirmedAt: new Date(), backupCodes: [] } });
    const session = await testDb.session.create({
      data: { id: `owner-${Math.random()}`, userId: user.id, expiresAt: new Date(Date.now() + 86_400_000), adminUntil: new Date(Date.now() + 3600_000) },
    });
    jar.set("vmeste_session", session.id);
    return { user, secret, admin: (await access.getAdminIdentity())! };
  }

  it("без свежего кода 2FA не выдаётся; с кодом — выдаётся и открывает свадьбы", async () => {
    const { admin, secret } = await owner();
    expect(admin.role).toBe("OWNER");
    const client = await wedding("client");

    expect((await grantSubscription(admin, client.user.id, 3, "", "")).ok).toBe(false);
    expect((await grantSubscription(admin, client.user.id, 3, "000000", "")).ok).toBe(false);
    expect((await testDb.user.findUniqueOrThrow({ where: { id: client.user.id } })).subscriptionUntil).toBeNull();

    const granted = await grantSubscription(admin, client.user.id, 3, totpAt(secret, currentStep()), "партнёр");
    expect(granted.ok).toBe(true);
    expect((await testDb.user.findUniqueOrThrow({ where: { id: client.user.id } })).subscriptionUntil).not.toBeNull();
    expect((await testDb.event.findUniqueOrThrow({ where: { id: client.event.id } })).paidAt).not.toBeNull();
    const row = await testDb.payment.findFirstOrThrow({ where: { eventId: client.event.id } });
    expect(row.provider).toBe("subscription");
    expect(row.amount).toBe(0);
    expect(await testDb.adminAudit.count({ where: { action: "user.subscription_grant" } })).toBe(1);
  });

  it("тот же код второй раз не проходит", async () => {
    const { admin, secret } = await owner();
    const a = await wedding("cl1");
    const b = await wedding("cl2");
    const code = totpAt(secret, currentStep());
    expect((await grantSubscription(admin, a.user.id, 1, code, "")).ok).toBe(true);
    expect((await grantSubscription(admin, b.user.id, 1, code, "")).ok).toBe(false);
    expect((await revokeSubscription(admin, a.user.id, code)).ok).toBe(false);
  });

  it("себе, администратору, без роли владельца и дольше года — нельзя", async () => {
    const { admin, user } = await owner();
    // Отказ должен прийти раньше проверки кода: код здесь неверный.
    expect((await grantSubscription(admin, user.id, 1, "123456", "")).message).toMatch(/Себе/);

    const staff = await wedding("staff");
    await testDb.user.update({ where: { id: staff.user.id }, data: { platformRole: "ADMIN" } });
    expect((await grantSubscription(admin, staff.user.id, 1, "123456", "")).message).toMatch(/Администраторам/);

    const client = await wedding("client2");
    expect((await grantSubscription({ ...admin, role: "ADMIN" }, client.user.id, 1, "123456", "")).message).toMatch(/только владелец/);
    expect((await grantSubscription(admin, client.user.id, 24, "123456", "")).message).toMatch(/срок/);
    expect((await testDb.user.findUniqueOrThrow({ where: { id: client.user.id } })).subscriptionUntil).toBeNull();
  });

  it("с подпиской новая свадьба открывается сразу", async () => {
    const client = await wedding("subnew");
    await testDb.user.update({ where: { id: client.user.id }, data: { subscriptionUntil: new Date(Date.now() + 86_400_000) } });
    const created = await createEvent(client.ctx, { title: "Новая", slug: "sub-new-wedding", eventDate: new Date() });
    expect((await testDb.event.findUniqueOrThrow({ where: { id: created!.id } })).paidAt).not.toBeNull();
  });
});
