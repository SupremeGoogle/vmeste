/**
 * Ссылки на загрузку фото. Гость удостоверяется токеном именной ссылки.
 *
 * Отдельный endpoint, а не Server Action: загрузка идёт из клиентского
 * кода, который сам режет превью в canvas и кладёт оба файла в хранилище.
 */
import { z } from "zod";
import { identifyByToken, identifyByEventSession } from "@/server/guest-access/identify";
import { startUpload } from "@/server/services/photos";

export const dynamic = "force-dynamic";

/**
 * Схема проверяет только форму запроса. Тип файла и размер намеренно
 * пропускаются дальше «как есть»: их отвергает `startUpload`, и он же
 * объясняет причину по-человечески («Файл больше 12 МБ»), а не общим
 * «некорректный запрос», которое гость увидел бы от zod.
 */
const bodySchema = z.object({
  // Одно из двух: токен именной ссылки или мероприятие плюс гостевая cookie.
  token: z.string().min(10).max(64).optional(),
  eventId: z.string().min(1).max(40).optional(),
  contentType: z.string().min(1).max(100),
  bytes: z.number().int().positive().max(10 * 1024 * 1024 * 1024),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const guest = parsed.data.token
    ? await identifyByToken(parsed.data.token)
    : parsed.data.eventId
      ? await identifyByEventSession(parsed.data.eventId)
      : null;
  // 404, а не 403: существование чужого мероприятия — тоже утечка.
  if (!guest) return Response.json({ error: "Приглашение не найдено" }, { status: 404 });

  const result = await startUpload(guest, {
    contentType: parsed.data.contentType,
    bytes: parsed.data.bytes,
  });
  if (!result.ok) {
    return Response.json({ error: result.message, reason: result.reason }, { status: 409 });
  }

  return Response.json({ ...result.ticket, left: result.left }, { headers: { "cache-control": "no-store" } });
}
