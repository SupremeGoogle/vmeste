/**
 * Очередь для тяжёлой работы (PDF печати): у сервера одно ядро и 1 ГБ
 * памяти на три сайта. Два PDF на 150 гостей одновременно — это сотни
 * мегабайт и минута процессора, а десять — падение всех трёх сайтов.
 *
 * Поэтому тяжёлое выполняется строго по одному; ждать в очереди могут
 * ещё `maxWaiting`, остальным сразу отвечаем «сервер занят» — лучше
 * попросить нажать ещё раз через минуту, чем уронить свадьбу.
 */

type Lane = { busy: boolean; waiting: (() => void)[] };
const lanes = new Map<string, Lane>();

export class ServerBusyError extends Error {
  constructor() {
    super("Сервер сейчас занят другой тяжёлой задачей — повторите через минуту");
  }
}

export async function withHeavySlot<T>(name: string, work: () => Promise<T>, maxWaiting = 3): Promise<T> {
  let lane = lanes.get(name);
  if (!lane) lanes.set(name, (lane = { busy: false, waiting: [] }));
  if (lane.busy) {
    if (lane.waiting.length >= maxWaiting) throw new ServerBusyError();
    await new Promise<void>((resolve) => lane.waiting.push(resolve));
  }
  lane.busy = true;
  try {
    return await work();
  } finally {
    const next = lane.waiting.shift();
    if (next) next();
    else lane.busy = false;
  }
}

/** Ответ 503 с подсказкой — для маршрутов, где очередь переполнена. */
export function busyResponse(): Response {
  return new Response(new ServerBusyError().message, {
    status: 503,
    headers: { "retry-after": "60", "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
