/**
 * Решение модератора по одному фото.
 *
 * Отдельный endpoint, а не Server Action: очередь модерации живёт в
 * клиентском компоненте с горячими клавишами и показывает решение сразу,
 * не дожидаясь ответа. Server Action тянет за собой перерисовку страницы —
 * при пятидесяти решениях подряд это заметно.
 */
import { z } from "zod";
import { requireEventContext } from "@/server/context";
import { moderatePhoto } from "@/server/services/photos";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  photoId: z.string().min(1).max(40),
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  // Чужое мероприятие даёт 404 внутри контекста — до фото дело не дойдёт.
  const ctx = await requireEventContext(eventId);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const ok = await moderatePhoto(ctx, parsed.data.photoId, parsed.data.status);
  if (!ok) return Response.json({ error: "Фото не найдено" }, { status: 404 });

  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
