/**
 * Вход через Google — OpenID Connect, руками и без библиотеки.
 *
 * Почему без next-auth: она тянет свою модель сессий, свои таблицы и свой
 * слой поверх нашего. Сессии организатора у нас уже есть — строка в БД и
 * HttpOnly-cookie, которую можно погасить (`auth/session.ts`). Отдавать это
 * библиотеке ради одной кнопки значит завести в проекте вторую систему
 * входа и потом всю жизнь следить, чтобы они не разъехались. Весь
 * протокол — два запроса и проверка полей.
 *
 * Подпись `id_token` мы намеренно не проверяем, и это не небрежность:
 * токен получен не из браузера, а прямым запросом к
 * `oauth2.googleapis.com` по TLS с нашим секретом. Спецификация
 * (OpenID Connect Core, §3.1.3.7, пункт 6) прямо разрешает пропустить
 * проверку подписи, когда токен пришёл по защищённому каналу
 * непосредственно от поставщика. Всё, что подделать нельзя иначе, —
 * `iss`, `aud` и срок — проверяется ниже.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** Настроен ли вход через Google. Кнопки нет, пока нет ключей. */
export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Адрес возврата. Берётся из `NEXT_PUBLIC_APP_URL`, а не из заголовков
 * запроса: подставив свой `Host`, можно было бы увести код авторизации
 * на чужой домен. Ровно этот адрес прописывается в консоли Google.
 */
export function callbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL("/api/auth/google/callback", base).toString();
}

export type Handshake = {
  /** Куда отправить браузер. */
  url: string;
  /** Что положить в cookie до возвращения человека. */
  state: string;
  verifier: string;
};

/**
 * Начало входа: случайные `state` и PKCE-verifier.
 *
 * `state` защищает от подсовывания чужого кода авторизации: вернувшийся
 * запрос обязан принести то же значение, что мы положили в cookie.
 * PKCE защищает сам код — перехвативший его в журнале прокси не сможет
 * обменять код на токен, не зная verifier.
 */
export function beginAuth(): Handshake {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("response_type", "code");
  // Ровно то, что нам нужно: имя, аватар, почта. Ни календаря, ни диска —
  // лишнее разрешение в окне согласия отпугивает сильнее, чем помогает.
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Человека, который уже вошёл одним аккаунтом, отправляем выбирать:
  // у организатора часто есть личная и рабочая почта.
  url.searchParams.set("prompt", "select_account");

  return { url: url.toString(), state, verifier };
}

/** Сравнение секретов за постоянное время. */
export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type GoogleProfile = {
  /** Неизменный идентификатор человека у Google. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

/** Разбор середины JWT. Подпись не проверяем — см. комментарий к файлу. */
function decodePayload(idToken: string): Record<string, unknown> {
  const middle = idToken.split(".")[1];
  if (!middle) throw new Error("id_token без полезной нагрузки");
  return JSON.parse(Buffer.from(middle, "base64url").toString("utf8"));
}

/**
 * Обмен кода на профиль. Бросает с человеческим текстом — вызывающий
 * маршрут показывает его на странице входа.
 */
export async function exchangeCode(code: string, verifier: string): Promise<GoogleProfile> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    // Google отвечает быстро; ждать дольше — держать человека на белом экране.
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("Google не принял запрос на вход");

  const tokens = (await response.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("Google не вернул сведения о профиле");

  const payload = decodePayload(tokens.id_token);

  // Кому выдан токен. Без этой проверки годился бы токен, выписанный
  // Google для совершенно другого приложения.
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("Токен выписан не нам");
  if (typeof payload.iss !== "string" || !ISSUERS.has(payload.iss)) {
    throw new Error("Токен выписан не Google");
  }
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    throw new Error("Срок токена истёк, попробуйте ещё раз");
  }

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!email || !sub) throw new Error("Google не сообщил почту");

  // Неподтверждённую почту не принимаем: иначе завести кабинет на чужой
  // адрес можно было бы, просто вписав его в свой профиль.
  if (payload.email_verified !== true) throw new Error("Почта в Google не подтверждена");

  return {
    sub,
    email,
    emailVerified: true,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
