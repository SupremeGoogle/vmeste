/**
 * FailURL Robokassa: оплата отменена или не прошла. Возвращаем на
 * страницу оплаты той свадьбы, где можно попробовать снова. Чужая
 * свадьба по номеру счёта всё равно не откроется: страница требует
 * сессию её владельца.
 *
 * В настройках магазина: Fail URL — https://vvvmeste.com/api/pay/robokassa/fail.
 */
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

async function handle(params: URLSearchParams): Promise<Response> {
  const raw = params.get("InvId") ?? "";
  const payment = /^\d{1,10}$/.test(raw)
    ? await db.payment.findUnique({ where: { invId: Number(raw) }, select: { eventId: true } })
    : null;
  const location = payment?.eventId ? `/app/e/${payment.eventId}/pay?status=fail` : "/app";
  return new Response(null, { status: 303, headers: { location, "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(new URL(request.url).searchParams);
}

export async function POST(request: Request) {
  return handle(new URLSearchParams(await request.text()));
}
