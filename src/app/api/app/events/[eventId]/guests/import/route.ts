/**
 * Загрузка списка гостей: файл → черновик импорта.
 *
 * Route handler, а не Server Action, по двум причинам. Серверное действие
 * принимает до 1 МБ, а Excel со списком бывает больше. И разбор с ИИ идёт
 * секунды — пока он идёт, организатор видит шаги («понимаем столбцы…»),
 * которые этот маршрут отдаёт потоком строк JSON.
 *
 * Без JS форма отправляется сюда же обычным POST, и ответом будет
 * переход на страницу гостей с черновиком или с текстом ошибки.
 */
import { requireEventContext } from "@/server/context";
import { rateLimit } from "@/server/rate-limit";
import { existingGuestNames } from "@/server/repositories/guests";
import { saveImportDraft } from "@/server/services/import-draft";
import { analyzeImport, type ImportStage } from "@/server/import/analyze";
import { IMPORT_LIMITS as L, ImportError, formatBytes } from "@/server/import/limits";

export const dynamic = "force-dynamic";

/** Разборы, идущие прямо сейчас: второй файл в то же мероприятие ждёт первого. */
const globalForImports = globalThis as unknown as { importsRunning?: Set<string> };
const running: Set<string> = (globalForImports.importsRunning ??= new Set());

type StreamEvent =
  | { type: "stage"; stage: ImportStage }
  | { type: "done"; draftId: string }
  | { type: "error"; message: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const streaming = (request.headers.get("accept") ?? "").includes("application/x-ndjson");
  // Относительный адрес: за прокси request.url показывает внутренний хост.
  const redirect = (query: Record<string, string>) =>
    new Response(null, {
      status: 303,
      headers: { location: `/app/e/${eventId}/guests?${new URLSearchParams(query)}` },
    });

  const fail = (message: string, status = 400) => {
    if (streaming) return Response.json({ type: "error", message } satisfies StreamEvent, { status });
    return redirect({ importError: message.slice(0, 300) });
  };

  // Размер проверяем до чтения тела: 50 МБ не должны лечь в память,
  // чтобы потом получить отказ.
  const length = Number(request.headers.get("content-length") ?? NaN);
  if (!Number.isFinite(length)) return fail("Не удалось принять файл. Попробуйте ещё раз.", 411);
  if (length > L.fileBytes + 64 * 1024) {
    return fail(`Файл больше ${formatBytes(L.fileBytes)}. Список гостей столько не занимает — возможно, в файле картинки: сохраните только таблицу.`, 413);
  }

  // Общий потолок против перебора файлов и отдельный, более строгий, — на умный разбор.
  const anyImport = rateLimit(`import:any:${ctx.eventId}`, 40, 3600_000);
  if (!anyImport.ok) return fail(`Слишком много загрузок подряд. Попробуйте через ${Math.ceil(anyImport.retryAfterSec / 60)} мин.`, 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Не удалось прочитать файл. Попробуйте ещё раз.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Выберите файл со списком гостей.");
  if (file.size > L.fileBytes) return fail(`Файл весит ${formatBytes(file.size)}, а можно до ${formatBytes(L.fileBytes)}.`, 413);

  let smart = form.get("smart") !== "off";
  let smartNote: string | null = null;
  if (smart) {
    const perEvent = rateLimit(`import:ai:event:${ctx.eventId}`, L.perEventHour, 3600_000);
    const perOrg = perEvent.ok ? rateLimit(`import:ai:org:${ctx.orgId}`, L.perOrgDay, 24 * 3600_000) : perEvent;
    if (!perEvent.ok || !perOrg.ok) {
      smart = false;
      smartNote = "умный разбор временно исчерпан — разобрали правилами";
    }
  }

  if (running.has(ctx.eventId)) return fail("Предыдущий файл ещё разбирается. Дождитесь его и попробуйте снова.", 409);

  // Занимаем сразу после проверки, до первого await: иначе два запроса
  // одновременно проходят проверку и оба запускают разбор.
  running.add(ctx.eventId);
  let buffer: ArrayBuffer;
  let existing: Map<string, string>;
  try {
    [buffer, existing] = await Promise.all([file.arrayBuffer(), existingGuestNames(ctx)]);
  } catch {
    running.delete(ctx.eventId);
    return fail("Не удалось прочитать файл. Попробуйте ещё раз.");
  }

  const run = async (onStage?: (stage: ImportStage) => void) => {
    try {
      const workspace = await analyzeImport({ buffer, fileName: file.name, smart, existingNames: existing, onStage });
      if (smartNote) workspace.ai = { ...workspace.ai, enabled: true, failure: smartNote };
      return saveImportDraft(ctx, workspace);
    } finally {
      running.delete(ctx.eventId);
    }
  };

  const messageOf = (error: unknown) => {
    if (error instanceof ImportError) return error.message;
    console.error("[import] разбор файла упал", error instanceof Error ? error.message : error);
    return "Не получилось разобрать файл. Попробуйте пересохранить его в Excel или загрузить CSV.";
  };

  if (!streaming) {
    try {
      const draftId = await run();
      return redirect({ draft: draftId });
    } catch (error) {
      return fail(messageOf(error));
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const draftId = await run((stage) => send({ type: "stage", stage }));
        send({ type: "done", draftId });
      } catch (error) {
        send({ type: "error", message: messageOf(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
