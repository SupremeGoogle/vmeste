/**
 * «Новый посетитель» от скрипта в странице (`lib/visit-beacon.ts`) —
 * уведомление владельцу в Telegram (`server/notify/visits.ts`).
 *
 * Адрес открыт всем, поэтому — маленькое тело, лимит по адресу и ответ
 * без подробностей: снаружи не видно, ушло уведомление или нет.
 */
import { rateLimit } from "@/server/rate-limit";
import { clientAddress } from "@/server/rate-limit/client-key";
import { recordVisit } from "@/server/notify/visits";

export const dynamic = "force-dynamic";

const done = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  const address = clientAddress(request);
  if (!rateLimit(`visit:${address}`, 30, 10 * 60_000).ok) return done();
  const text = await request.text();
  if (text.length > 2000) return done();
  let body: { p?: unknown; f?: unknown; r?: unknown; w?: unknown; l?: unknown; s?: unknown; d?: unknown; c?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return done();
  }
  const path = typeof body.p === "string" && body.p.startsWith("/") ? body.p : "/";
  const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : undefined);
  let ownHost: string | null = null;
  try {
    ownHost = new URL(request.url).hostname;
  } catch {}
  recordVisit({
    path,
    referrer: typeof body.r === "string" ? body.r.slice(0, 500) : "",
    width: typeof body.w === "number" ? body.w : undefined,
    language: typeof body.l === "string" ? body.l : undefined,
    userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? "",
    exitPath: typeof body.f === "string" && body.f.startsWith("/") ? body.f : undefined,
    seconds: num(body.s, 86_400),
    scroll: num(body.d, 100),
    clicks: Array.isArray(body.c) ? body.c.filter((x): x is string => typeof x === "string").slice(0, 6).map((x) => x.slice(0, 40)) : undefined,
    address,
    ownHost: (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ownHost)?.split(":")[0] ?? null,
  });
  return done();
}
