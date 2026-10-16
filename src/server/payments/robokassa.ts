/**
 * Robokassa: ссылка на оплату, проверка уведомлений, запрос статуса.
 *
 * Документация: https://docs.robokassa.ru/ru/pay-interface,
 * /ru/notifications-and-redirects, /ru/xml-interfaces.
 *
 * Пароли магазина живут только в переменных окружения:
 *   ROBOKASSA_LOGIN      — идентификатор магазина (MerchantLogin);
 *   ROBOKASSA_PASSWORD1  — пароль №1: подпись ссылки на оплату и SuccessURL;
 *   ROBOKASSA_PASSWORD2  — пароль №2: подпись уведомления ResultURL и запроса статуса;
 *   ROBOKASSA_HASH       — алгоритм подписи, как в «Технических настройках»
 *                          магазина: md5 | sha1 | sha256 | sha384 | sha512 (по умолчанию sha256);
 *   ROBOKASSA_TEST=1     — тестовый режим (IsTest=1, тестовая пара паролей);
 *   ROBOKASSA_RECEIPT=1  — передавать состав чека (нужно для ИП с онлайн-кассой;
 *                          самозанятому чек формирует «Робочеки СМЗ» по настройкам магазина).
 *
 * Деньги считаются полученными только по уведомлению ResultURL с верной
 * подписью паролем №2 — его знают только мы и Robokassa. Переход
 * покупателя на SuccessURL — лишь повод показать «спасибо».
 */
import { createHash, timingSafeEqual } from "node:crypto";

const PAY_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";
const STATE_URL = "https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt";
const ALGORITHMS = new Set(["md5", "sha1", "sha256", "sha384", "sha512"]);

export type RobokassaConfig = {
  login: string;
  password1: string;
  password2: string;
  hash: string;
  test: boolean;
  receipt: boolean;
};

export function robokassaConfig(): RobokassaConfig | null {
  const login = process.env.ROBOKASSA_LOGIN?.trim();
  const password1 = process.env.ROBOKASSA_PASSWORD1?.trim();
  const password2 = process.env.ROBOKASSA_PASSWORD2?.trim();
  if (!login || !password1 || !password2) return null;
  const hash = (process.env.ROBOKASSA_HASH || "sha256").trim().toLowerCase();
  if (!ALGORITHMS.has(hash)) return null;
  return {
    login, password1, password2, hash,
    test: process.env.ROBOKASSA_TEST === "1",
    receipt: process.env.ROBOKASSA_RECEIPT === "1",
  };
}

function digest(config: RobokassaConfig, parts: string[]): string {
  return createHash(config.hash).update(parts.join(":"), "utf8").digest("hex");
}

/** Сравнение подписей без утечки по времени; регистр не важен (hex). */
function sameSignature(expected: string, received: string): boolean {
  const a = Buffer.from(expected.toLowerCase(), "utf8");
  const b = Buffer.from(received.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Сумма для Robokassa: рубли через точку, две цифры после неё. */
export function outSum(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}

/** Сумма из уведомления («1490.000000») в копейках; null — не число. */
export function parseOutSum(raw: string | null): number | null {
  if (!raw || !/^\d{1,9}(\.\d{1,6})?$/.test(raw)) return null;
  return Math.round(Number(raw) * 100);
}

export type PaymentLinkInput = {
  invId: number;
  kopecks: number;
  description: string;
  email?: string;
  lang?: "ru" | "en";
  /** Название позиции в чеке (только при ROBOKASSA_RECEIPT=1). */
  itemName?: string;
};

export function paymentUrl(config: RobokassaConfig, input: PaymentLinkInput): string {
  const sum = outSum(input.kopecks);
  const inv = String(input.invId);
  const params = new URLSearchParams({
    MerchantLogin: config.login,
    OutSum: sum,
    InvId: inv,
    // До 100 символов, без спецсимволов.
    Description: input.description.replace(/[^\p{L}\p{N} .,№-]/gu, "").slice(0, 100),
    Culture: input.lang === "en" ? "en" : "ru",
    Encoding: "utf-8",
  });
  if (input.email) params.set("Email", input.email);

  let receipt: string | null = null;
  if (config.receipt) {
    // В подпись — JSON, закодированный один раз; в адрес — он же,
    // URLSearchParams закодирует его второй раз, как требует Robokassa.
    receipt = encodeURIComponent(JSON.stringify({
      items: [{
        name: (input.itemName ?? input.description).slice(0, 128),
        quantity: 1,
        sum: Number(sum),
        payment_method: "full_payment",
        payment_object: "service",
        tax: "none",
      }],
    }));
    params.set("Receipt", receipt);
  }
  if (config.test) params.set("IsTest", "1");

  const parts = [config.login, sum, inv, ...(receipt ? [receipt] : []), config.password1];
  params.set("SignatureValue", digest(config, parts));
  return `${PAY_URL}?${params.toString()}`;
}

export type VerifiedNotice = { invId: number; kopecks: number; outSumRaw: string };

/**
 * Уведомление об оплате (ResultURL): подпись OutSum:InvId:Пароль#2.
 * Сумма хешируется в том виде, в каком пришла («1490.000000»).
 * Shp_-параметров мы не передаём; пришли — подпись с ними не сойдётся,
 * и уведомление будет отвергнуто, что и правильно.
 */
export function verifyResultNotice(config: RobokassaConfig, params: URLSearchParams): VerifiedNotice | null {
  const outSumRaw = params.get("OutSum") ?? "";
  const invRaw = params.get("InvId") ?? "";
  const signature = params.get("SignatureValue") ?? "";
  if (!/^\d{1,10}$/.test(invRaw) || !signature) return null;
  const kopecks = parseOutSum(outSumRaw);
  if (kopecks === null) return null;
  const extra = [...params.keys()].filter((key) => key.toLowerCase().startsWith("shp_"));
  if (extra.length) return null;
  if (!sameSignature(digest(config, [outSumRaw, invRaw, config.password2]), signature)) return null;
  return { invId: Number(invRaw), kopecks, outSumRaw };
}

/** Возврат покупателя на SuccessURL: подпись OutSum:InvId:Пароль#1. */
export function verifySuccessReturn(config: RobokassaConfig, params: URLSearchParams): number | null {
  const outSumRaw = params.get("OutSum") ?? "";
  const invRaw = params.get("InvId") ?? "";
  const signature = params.get("SignatureValue") ?? "";
  if (!/^\d{1,10}$/.test(invRaw) || !signature || parseOutSum(outSumRaw) === null) return null;
  return sameSignature(digest(config, [outSumRaw, invRaw, config.password1]), signature) ? Number(invRaw) : null;
}

export type OperationState = { code: number; kopecks: number | null };

/**
 * Статус счёта прямо у Robokassa (OpStateExt) — запасной путь, если
 * уведомление ResultURL задержалось. В тестовом режиме не работает.
 * Код 100 — оплачено и зачислено.
 */
export async function operationState(config: RobokassaConfig, invId: number): Promise<OperationState | null> {
  if (config.test) return null;
  const params = new URLSearchParams({
    MerchantLogin: config.login,
    InvoiceID: String(invId),
    Signature: digest(config, [config.login, String(invId), config.password2]),
  });
  try {
    const response = await fetch(`${STATE_URL}?${params}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return null;
    const xml = await response.text();
    const result = /<Result>\s*<Code>(\d+)<\/Code>/i.exec(xml);
    if (!result || result[1] !== "0") return null;
    const state = /<State>\s*<Code>(\d+)<\/Code>/i.exec(xml);
    if (!state) return null;
    const sum = /<OutSum>([\d.]+)<\/OutSum>/i.exec(xml);
    return { code: Number(state[1]), kopecks: sum ? parseOutSum(sum[1]) : null };
  } catch {
    return null;
  }
}
