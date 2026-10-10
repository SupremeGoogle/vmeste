/**
 * Подтверждение загрузки: строка в БД появляется только здесь и только
 * после того, как хранилище подтвердило, что файл на месте
 * (см. `services/photos.ts`).
 */
import { tooManyFromClient } from "@/server/rate-limit/client-key";
import { z } from "zod";
import { identifyByToken, identifyByEventSession } from "@/server/guest-access/identify";
import { completeUpload } from "@/server/services/photos";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(10).max(64).optional(),
  eventId: z.string().min(1).max(40).optional(),
  // Превью, ширину и высоту теперь считает сервер при перекодировании.
  // Старая страница в открытой вкладке ещё шлёт их — zod молча отбросит.
  storageKey: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const limited = tooManyFromClient(request, "photo-complete", 240);
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Некорректный запрос · Invalid request" }, { status: 400 });
  }

  const { token, eventId, ...input } = parsed.data;
  const guest = token
    ? await identifyByToken(token)
    : eventId
      ? await identifyByEventSession(eventId)
      : null;
  if (!guest) return Response.json({ error: "Приглашение не найдено · Invitation not found" }, { status: 404 });

  const result = await completeUpload(guest, input);
  if (!result.ok) {
    return Response.json({ error: result.message, reason: result.reason }, { status: 409 });
  }

  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
