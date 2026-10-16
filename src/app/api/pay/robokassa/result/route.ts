/**
 * ResultURL Robokassa — уведомление об оплате, сервер к серверу.
 *
 * Единственное место, где свадьба становится оплаченной по сигналу извне.
 * Подпись проверяется паролем №2 (payments/robokassa.ts), сумма — по счёту
 * в базе, повтор уведомления безопасен (server/billing.ts). Ответ
 * `OK{InvId}` — так Robokassa понимает, что уведомление принято.
 *
 * В «Технических настройках» магазина: Result URL —
 * https://vvvmeste.com/api/pay/robokassa/result, метод POST (GET тоже принимаем).
 */
import { robokassaConfig, verifyResultNotice } from "@/server/payments/robokassa";
import { confirmPayment } from "@/server/billing";
import { requestOrigin } from "@/server/auth/session";

export const dynamic = "force-dynamic";

function text(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

async function handle(params: URLSearchParams): Promise<Response> {
  const config = robokassaConfig();
  if (!config) return text("payments disabled", 503);

  const notice = verifyResultNotice(config, params);
  if (!notice) {
    const { ip } = await requestOrigin();
    console.warn(`[robokassa] отвергнуто уведомление с неверной подписью, InvId=${params.get("InvId")}, ip=${ip}`);
    return text("bad signature", 400);
  }

  const providerData: Record<string, string> = { source: "ResultURL", outSum: notice.outSumRaw };
  for (const key of ["Fee", "PaymentMethod", "IncCurrLabel"]) {
    const value = params.get(key);
    if (value) providerData[key] = value.slice(0, 100);
  }

  const result = await confirmPayment(notice.invId, notice.kopecks, providerData);
  if (result === "unknown") return text("unknown invoice", 404);
  if (result === "amount") return text("amount mismatch", 400);
  return text(`OK${notice.invId}`);
}

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded")) {
    return handle(new URLSearchParams(await request.text()));
  }
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form) if (typeof value === "string") params.append(key, value);
    return handle(params);
  }
  return handle(new URL(request.url).searchParams);
}

export async function GET(request: Request) {
  return handle(new URL(request.url).searchParams);
}
