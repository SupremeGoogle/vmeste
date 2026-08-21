/**
 * Приём одной операции рассадки от редактора.
 *
 * Клиент присылает действие вместе с версией плана, которую он видел.
 * Если версия разошлась — 409 и текущая версия: значит, кто-то правит
 * рассадку в другом окне, и молча перетирать его работу нельзя.
 */
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireEventContext } from "@/server/context";
import { applyOp, seatingOpSchema } from "@/server/services/seating-ops";
import { seatingTag } from "@/lib/cache-tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  version: z.number().int().nonnegative(),
  op: seatingOpSchema,
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Непонятная операция" }, { status: 400 });
  }

  const result = await applyOp(ctx, parsed.data.op, parsed.data.version);

  if (result.ok) {
    // Гостевой план зала кеширован по этому тегу: без сброса гость увидит
    // стол, с которого его пересадили пять минут назад (PLAN.md §5.7).
    revalidateTag(seatingTag(eventId), "max");
    return NextResponse.json({ ok: true, version: result.version, undo: result.undo });
  }

  if (result.reason === "conflict") {
    return NextResponse.json(
      {
        ok: false,
        reason: "conflict",
        version: result.version,
        message: "Рассадку изменили в другом окне",
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { ok: false, reason: result.reason, message: result.message },
    { status: result.reason === "gone" ? 404 : 422 },
  );
}
