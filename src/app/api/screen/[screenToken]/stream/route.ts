/**
 * Поток событий для экрана в зале (SSE).
 *
 * Почему SSE, а не WebSocket — PLAN.md §4.1: поток односторонний, а
 * переподключение с `Last-Event-ID` встроено в браузер. Именно оно решает,
 * переживёт ли экран моргнувший вайфай в зале, — а руками оно пишется
 * долго и с ошибками.
 *
 * Что здесь сделано ради живучести:
 *   — комментарий-пульс раз в 20 секунд: молчащее соединение прокси рвут;
 *   — `X-Accel-Buffering: no`: иначе события копятся в буфере nginx
 *     и приезжают пачкой через минуту;
 *   — у каждого события монотонный `id`; при реконнекте отдаём
 *     пропущенное, а если разрыв был длинный — просим забрать снимок;
 *   — `retry:` в первом же сообщении: браузер по умолчанию ждёт 3 секунды,
 *     нам хватит одной, экран в зале должен возвращаться незаметно.
 *
 * Маршрут требует долгоживущего Node-процесса (PLAN.md §4.9): на
 * serverless-функции соединение оборвётся по таймауту.
 */
import { accessByScreenToken, touchScreen } from "@/server/services/screen";
import { bus } from "@/server/events/bus";
import type { ScreenEvent } from "@/server/events/bus";

export const dynamic = "force-dynamic";
/**
 * Соединение живёт часами: свадьба идёт весь вечер. Значение — литерал,
 * а не `60 * 60 * 6`: конфигурацию сегмента Next разбирает статически
 * и на выражение отвечает «Invalid segment configuration export»,
 * роняя сборку.
 */
export const maxDuration = 21600;

const HEARTBEAT_MS = 20_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ screenToken: string }> },
) {
  const { screenToken } = await params;
  const access = await accessByScreenToken(screenToken);
  if (!access) return new Response(null, { status: 404 });

  await touchScreen(access.tokenId, access.eventId);

  const lastEventId = Number(request.headers.get("last-event-id") ?? "");
  const missed = Number.isFinite(lastEventId) && lastEventId > 0
    ? bus.replay(access.eventId, lastEventId)
    : [];

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const sendEvent = (event: ScreenEvent) =>
        send(
          `id: ${event.seq}\nevent: ${event.type}\n` +
            `data: ${JSON.stringify({ id: event.entityId ?? null })}\n\n`,
        );

      function cleanup() {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // соединение уже разорвано клиентом
        }
      }

      send("retry: 1000\n\n");

      if (missed === null) {
        // Разрыв был дольше нашей памяти — пусть экран заберёт снимок целиком.
        send("event: resync\ndata: {}\n\n");
      } else {
        for (const event of missed) sendEvent(event);
      }

      unsubscribe = bus.subscribe(access.eventId, sendEvent);

      let beats = 0;
      heartbeat = setInterval(() => {
        send(`: пульс\n\n`);
        beats++;

        // Отзыв ссылки должен гасить чужой ноутбук, а не только запрещать
        // новые подключения: открытое соединение живёт часами и пережило бы
        // отзыв целиком. Проверяем на каждом пульсе — задержка до 20 секунд,
        // зато один запрос в базу на экран, а не на каждое событие.
        void accessByScreenToken(screenToken).then((still) => {
          if (still) {
            // Отметка «на связи» — раз в минуту: в панели важно «жив или нет».
            if (beats % 3 === 0) void touchScreen(access.tokenId, access.eventId);
            return;
          }
          send("event: revoked\ndata: {}\n\n");
          cleanup();
        });
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      // Отключает буферизацию у nginx: без этого события копятся
      // и приезжают пачкой (PLAN.md §4.1).
      "x-accel-buffering": "no",
    },
  });
}
