/**
 * Поиск гостя по имени. Единственный запрос, который делает страница входа.
 *
 * Что здесь защищается: знание короткого кода НЕ должно давать список гостей.
 * Поэтому лимит на IP, максимум 5 совпадений в ответе и никаких данных,
 * кроме имени и стола.
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { findEventByShortCode } from "@/server/repositories/events";
import { searchGuests } from "@/server/services/guest-search";
import { rateLimit } from "@/server/rate-limit";
import { lookupKeys, WINDOW_MS } from "@/server/rate-limit/client-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ query: z.string().min(1).max(80) });

/** IP не храним в открытом виде: журнал живёт дольше свадьбы. */
function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const ip = clientIp(req);

  // 20 поисков в минуту с одного адреса. Живому гостю хватает трёх;
  // перебор списка становится дорогим и заметным в журнале.
  const keys = lookupKeys(req, shortCode);
  const limited = [
    rateLimit(keys.client.key, keys.client.limit, WINDOW_MS),
    rateLimit(keys.event.key, keys.event.limit, WINDOW_MS),
  ].find((r) => !r.ok) ?? { ok: true as const, retryAfterSec: 0 };
  if (!limited.ok) {
    return NextResponse.json(
      { status: "rate_limited", message: "Слишком много попыток. Подождите минуту." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "bad_request", message: "Пустой запрос" }, { status: 400 });
  }

  const event = await findEventByShortCode(shortCode);
  // Неверный код и ненайденное имя отвечают одинаково: по разнице ответов
  // можно было бы перебирать существующие коды мероприятий.
  if (!event) return NextResponse.json({ status: "not_found" });

  const result = await searchGuests(event.id, parsed.data.query);

  // Журнал нужен организатору: видно, кого искали и не нашли.
  await db.guestActionLog.create({
    data: {
      orgId: event.orgId,
      eventId: event.id,
      action: "checkin_lookup",
      detail: `${result.status}: ${parsed.data.query.slice(0, 60)}`,
      ipHash: hashIp(ip),
      ua: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
  }).catch(() => {
    /* журнал не должен ронять вход в зал */
  });

  if (result.status !== "ok") {
    return NextResponse.json(
      result.status === "too_many" ? { status: "too_many" } : { status: result.status },
    );
  }

  return NextResponse.json({
    status: "ok",
    matches: result.matches.map((m) => ({
      guestId: m.guestId,
      displayName: m.displayName,
      tableLabel: m.tableLabel,
      seatIndex: m.seatIndex,
    })),
  });
}
