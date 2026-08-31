/**
 * Создание кабинета и вход через Google.
 *
 * Проверяется то, что ломается молча и обнаруживается через месяц:
 * человек без организации (панель встретит пустым экраном), второй кабинет
 * на ту же почту вместо привязки и чужой токен, принятый за свой.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import { createAccount, freeOrgSlug } from "@/server/services/signup";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import { beginAuth, sameSecret, callbackUrl } from "@/server/auth/google";

beforeEach(resetDb);
afterAll(resetDb);

describe("создание кабинета", () => {
  it("заводит владельца вместе с организацией", async () => {
    const userId = await createAccount({ name: "Аня Ветрова", email: "anya@example.com" });

    const membership = await testDb.membership.findFirstOrThrow({
      where: { userId },
      include: { organization: true },
    });

    expect(membership.role).toBe("OWNER");
    expect(membership.organization.name).toBe("Аня Ветрова");
    // Название русское, адрес обязан быть латиницей: ссылку набирают руками.
    expect(membership.organization.slug).toBe("anya-vetrova");
  });

  it("название студии заменяет имя, если оно указано", async () => {
    const userId = await createAccount({
      name: "Аня Ветрова",
      orgName: "Студия Вместе",
      email: "studio@example.com",
    });

    const membership = await testDb.membership.findFirstOrThrow({
      where: { userId },
      include: { organization: true },
    });
    expect(membership.organization.name).toBe("Студия Вместе");
  });

  it("подбирает свободный адрес для тёзок", async () => {
    await createAccount({ name: "Аня Ветрова", email: "one@example.com" });
    await createAccount({ name: "Аня Ветрова", email: "two@example.com" });

    expect(await freeOrgSlug("Аня Ветрова")).toBe("anya-vetrova-3");
  });

  it("пользователь из Google живёт без пароля", async () => {
    const userId = await createAccount({
      name: "Миша Ветров",
      email: "misha@example.com",
      emailVerified: true,
      avatarUrl: "https://lh3.googleusercontent.com/a/example",
    });

    const user = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.passwordHash).toBeNull();
    expect(user.emailVerified).toBe(true);

    // Ни один пароль не должен подойти к пустому месту.
    expect(await verifyPassword("", user.passwordHash)).toBe(false);
    expect(await verifyPassword("любой", user.passwordHash)).toBe(false);
  });

  it("вторая регистрация на ту же почту не проходит", async () => {
    await createAccount({ name: "Аня", email: "same@example.com" });
    await expect(
      createAccount({ name: "Аня ещё раз", email: "same@example.com" }),
    ).rejects.toThrow();
  });

  it("пароль сохраняется проверяемым", async () => {
    const userId = await createAccount({
      name: "Аня",
      email: "parol@example.com",
      passwordHash: await hashPassword("правильный-пароль"),
    });

    const user = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword("правильный-пароль", user.passwordHash)).toBe(true);
    expect(await verifyPassword("другой", user.passwordHash)).toBe(false);
  });
});

describe("привязка входа через Google", () => {
  it("одна учётная запись Google не привязывается дважды", async () => {
    const userId = await createAccount({ name: "Аня", email: "g@example.com" });
    const account = {
      userId,
      provider: "GOOGLE" as const,
      providerAccountId: "108164543",
      email: "g@example.com",
    };

    await testDb.oAuthAccount.create({ data: account });
    await expect(testDb.oAuthAccount.create({ data: account })).rejects.toThrow();
  });

  it("узнаёт человека по sub, а не по почте: почту в Google меняют", async () => {
    const userId = await createAccount({ name: "Аня", email: "staraya@example.com" });
    await testDb.oAuthAccount.create({
      data: { userId, provider: "GOOGLE", providerAccountId: "777", email: "staraya@example.com" },
    });

    const found = await testDb.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: "777" } },
    });
    expect(found?.userId).toBe(userId);
  });
});

describe("рукопожатие с Google", () => {
  it("просит только имя, почту и профиль", () => {
    process.env.GOOGLE_CLIENT_ID = "test-client";
    const { url } = beginAuth();
    const params = new URL(url).searchParams;

    expect(params.get("scope")).toBe("openid email profile");
    expect(params.get("response_type")).toBe("code");
  });

  it("каждый вход получает свои state и PKCE", () => {
    const first = beginAuth();
    const second = beginAuth();

    expect(first.state).not.toBe(second.state);
    expect(first.verifier).not.toBe(second.verifier);
    // Verifier не должен утекать в адрес — уходит только его хеш.
    expect(first.url).not.toContain(first.verifier);
    expect(new URL(first.url).searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("чужой state не принимается", () => {
    const { state } = beginAuth();
    expect(sameSecret(state, state)).toBe(true);
    expect(sameSecret(state, beginAuth().state)).toBe(false);
    // Разная длина не должна ронять сравнение.
    expect(sameSecret(state, "коротко")).toBe(false);
  });

  it("адрес возврата берётся из настройки, а не из заголовков запроса", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vmeste.example";
    expect(callbackUrl()).toBe("https://vmeste.example/api/auth/google/callback");
  });
});
