/**
 * SuccessURL Robokassa: покупатель вернулся после оплаты.
 *
 * Адрес возврата у магазина один на все свадьбы, поэтому здесь находим
 * свадьбу по номеру счёта и ведём на её страницу «спасибо». Ничего не
 * оплачиваем: деньги подтверждает только ResultURL (../result/route.ts).
 * Подпись паролем №1 проверяем, чтобы чужую ссылку нельзя было подставить.
 *
 * В настройках магазина: Success URL — https://vvvmeste.com/api/pay/robokassa/success.
 */
import { db } from "@/server/db";
import { robokassaConfig, verifySuccessReturn } from "@/server/payments/robokassa";

export const dynamic = "force-dynamic";

async function handle(params: URLSearchParams): Promise<Response> {
  const config = robokassaConfig();
  const invId = config ? verifySuccessReturn(config, params) : null;
  const payment = invId ? await db.payment.findUnique({ where: { invId }, select: { eventId: true } }) : null;
  const location = payment?.eventId ? `/app/e/${payment.eventId}/pay/done?inv=${invId}&t=${Date.now()}` : "/app";
  return new Response(null, { status: 303, headers: { location, "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(new URL(request.url).searchParams);
}

export async function POST(request: Request) {
  return handle(new URLSearchParams(await request.text()));
}
