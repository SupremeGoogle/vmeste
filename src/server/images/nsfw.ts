/**
 * Оценка «18+» для загруженных картинок — NSFWJS MobileNetV2Mid.
 *
 * По оценке решается, публиковать ли гостевое фото сразу: ниже
 * `NSFW_FLAG` — публикуется само, выше или без оценки — ждёт организатора.
 * В очереди модерации такой кадр приходит размытым и с пометкой, чтобы
 * не всплыть на весь экран при гостях.
 *
 * Как это устроено при сервере на 1 ГБ:
 *   — модель работает в **отдельном процессе** (`workers/nsfw.mjs`). Он
 *     запускается при первом фото и сам закрывается после 90 секунд без
 *     работы: в день без свадьбы модели в памяти нет вовсе, а раньше она
 *     занимала ~115 МБ сайта постоянно — с первой фотографии до перезапуска;
 *   — сбой или переполнение памяти роняет этот процесс, а не сайт;
 *   — MobileNetV2Mid: точнее базовой MobileNetV2 при той же памяти
 *     (замер: +94 МБ, ~70 мс на фото на WASM). InceptionV3 точнее ещё, но
 *     +350 МБ — серверу на 1 ГБ не по силам;
 *   — уменьшение до 224 px делает сайт (sharp), процессу уходит только
 *     150 КБ пикселей; фото проверяются строго по одному.
 *
 * Если что-то пошло не так (процесс не поднялся, не ответил за 20 с),
 * возвращается `null`: фото принимается, но без оценки не публикуется
 * само, а уходит организатору — потерять кадр хуже, чем попросить
 * человека взглянуть на него.
 */
import { fork, type ChildProcess } from "node:child_process";
import { setPriority } from "node:os";
import path from "node:path";
import sharp from "sharp";

/** С этой оценки фото не публикуется само и в очереди приходит размытым. */
export const NSFW_FLAG = 0.6;
/**
 * С этой — картинка организатора не принимается вовсе: она уходит в
 * публичное приглашение без модерации. Порог высокий, потому что
 * свадебные фото в открытых платьях — обычное дело, а не повод отказать.
 */
export const NSFW_BLOCK = 0.9;

const SIZE = 224;
const WORKER_PATH = ["workers", "nsfw.mjs"];
/** Первая проверка включает загрузку модели — запас на медленный диск. */
const TIMEOUT_MS = 20_000;

type Pending = { resolve: (score: number | null) => void; timer: NodeJS.Timeout; child: ChildProcess | null };

let worker: ChildProcess | null = null;
const pending = new Map<number, Pending>();
let nextId = 1;

function settle(id: number, score: number | null) {
  const job = pending.get(id);
  if (!job) return;
  clearTimeout(job.timer);
  pending.delete(id);
  job.resolve(score);
}

/** Проверки, ушедшие в этот процесс, — не в новый, поднятый ему на смену. */
function failAllOf(child: ChildProcess) {
  for (const [id, job] of [...pending.entries()]) if (job.child === child) settle(id, null);
}

function ensureWorker(): ChildProcess {
  if (worker && worker.connected && worker.exitCode === null) return worker;
  // Путь собирается из частей нарочно: буквальный `path.join(cwd, "workers", …)`
  // Turbopack принимает за импорт и пытается встроить процесс в сборку.
  const child = fork(path.join(process.cwd(), ...WORKER_PATH), [], {
    serialization: "advanced",
    stdio: ["ignore", "ignore", "inherit", "ipc"],
    // Модели хватает с запасом; при утечке процесс упадёт сам, а не сервер.
    execArgv: ["--max-old-space-size=384"],
  });
  // Ниже приоритет — позже процессор: страницы сайта и соседей идут первыми.
  try {
    if (child.pid) setPriority(child.pid, 15);
  } catch {
    // Нет прав на смену приоритета — работаем как есть.
  }
  child.on("message", (message: { id: number; score?: number; error?: string }) => {
    settle(message.id, typeof message.score === "number" ? message.score : null);
  });
  // Процесс закрылся (простой, сбой) — незавершённые проверки уходят организатору.
  child.on("exit", () => {
    if (worker === child) worker = null;
    failAllOf(child);
  });
  child.on("error", () => {
    if (worker === child) worker = null;
    failAllOf(child);
  });
  worker = child;
  return child;
}

/** Остановить процесс проверки (тесты, завершение сайта). */
export function stopNsfwWorker(): void {
  worker?.kill();
  worker = null;
}

/** Сколько проверок ждут ответа — для тестов. */
export function nsfwPending(): number {
  return pending.size;
}

/** Работает ли сейчас процесс проверки — для тестов и панели. */
export function nsfwWorkerRunning(): boolean {
  return Boolean(worker && worker.exitCode === null);
}

/**
 * Вероятность, что на картинке откровенный контент: сумма классов
 * Porn и Hentai. Класс Sexy (купальники, декольте) не учитывается
 * намеренно — на свадьбе он срабатывал бы через кадр.
 */
export async function nsfwScore(image: Buffer): Promise<number | null> {
  let pixels: Buffer;
  try {
    pixels = (await sharp(image).resize(SIZE, SIZE, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => settle(id, null), TIMEOUT_MS);
    try {
      const child = ensureWorker();
      pending.set(id, { resolve, timer, child });
      child.send({ id, pixels: new Uint8Array(pixels) }, (error) => {
        if (error) settle(id, null);
      });
    } catch {
      settle(id, null);
    }
  });
}
