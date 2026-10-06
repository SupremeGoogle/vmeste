/**
 * Перекодирование картинок после загрузки.
 *
 * В хранилище не должно оставаться то, что прислал телефон, как есть:
 *   — HEIC с айфона не показывает ни Chrome, ни Firefox, а модерация и
 *     экран в зале открыты как раз в них;
 *   — исходник весит 3–25 МБ, а экран в зале листает сотни кадров по
 *     Wi‑Fi площадки;
 *   — в EXIF лежат координаты съёмки, то есть нередко адрес гостя.
 *
 * Поэтому любой принятый файл превращается в WebP: повёрнутый по EXIF,
 * без метаданных, в sRGB, не больше заданного размера. Формат
 * определяется по содержимому — заголовку `Content-Type` из браузера
 * здесь не верят.
 *
 * HEIC (HEVC) готовые сборки libvips не декодируют — патенты, — поэтому
 * для него отдельный путь через libheif в WASM (`heic-decode`).
 *
 * Сама работа идёт в отдельном процессе `workers/images.mjs` с пониженным
 * приоритетом: нагрузочный тест 6 октября 2026 показал, что 10 фото разом
 * внутри сайта отнимали процессор у страниц (приглашения и анкета отвечали
 * по 10–20 с). Теперь страницы получают процессор первыми. Процесс
 * запускается при первом фото и закрывается после 90 с простоя; упадёт или
 * съест память — упадёт он, а не сайт.
 */
import { fork, type ChildProcess } from "node:child_process";
import { setPriority } from "node:os";
import path from "node:path";

export type ImagePreset = {
  /** Длинная сторона итогового файла. Меньшие картинки не растягиваются. */
  maxSide: number;
  quality: number;
  /** Превью для сетки. Нет — превью не делается. */
  thumb?: { maxSide: number; quality: number };
  /** Сохранять анимацию GIF/WebP. Иначе остаётся первый кадр. */
  animated: boolean;
};

/**
 * Гостевые фото: 2560 px хватает и для экрана в зале, и для скачивания
 * на память, а весит такой кадр 0,4–1 МБ вместо 5.
 */
export const GUEST_PHOTO: ImagePreset = {
  maxSide: 2560,
  quality: 80,
  thumb: { maxSide: 480, quality: 72 },
  animated: false,
};

/**
 * Картинки организатора — обложки и фоны приглашения. Сжимаются мягче:
 * их разглядывают на весь экран, и артефакты сжатия на лице пары видны
 * сразу. Анимация сохраняется — ради живых обложек, но с меньшим
 * пределом по стороне: анимированный кадр тяжелее в разы.
 */
export const INVITE_ASSET: ImagePreset = {
  maxSide: 3200,
  quality: 88,
  animated: true,
};
export type Converted = {
  body: Buffer;
  width: number;
  height: number;
  thumb: Buffer | null;
  contentType: "image/webp";
};

export class UnreadableImage extends Error {}

/** Путь собирается из частей нарочно: буквальный путь Turbopack принимает за импорт. */
const WORKER_PATH = ["workers", "images.mjs"];
/** 48-Мп HEIC на занятом ядре с низким приоритетом может идти долго. */
const TIMEOUT_MS = 180_000;
/** Ниже приоритет — позже процессор: страницы сайта и соседних сайтов идут первыми. */
const NICE = 15;

type Reply = { id: number; body?: Uint8Array; width?: number; height?: number; thumb?: Uint8Array | null; error?: "unreadable" | "failed"; message?: string };
type Job = { resolve: (value: Converted) => void; reject: (error: Error) => void; timer: NodeJS.Timeout; child: ChildProcess };

let worker: ChildProcess | null = null;
const pending = new Map<number, Job>();
let nextId = 1;

function finish(id: number, settle: (job: Job) => void) {
  const job = pending.get(id);
  if (!job) return;
  clearTimeout(job.timer);
  pending.delete(id);
  settle(job);
}

/** Задания, ушедшие в этот процесс, — не в новый, поднятый ему на смену. */
function failAllOf(child: ChildProcess, reason: string) {
  for (const [id, job] of [...pending.entries()]) if (job.child === child) finish(id, (j) => j.reject(new Error(reason)));
}

function ensureWorker(): ChildProcess {
  if (worker && worker.connected && worker.exitCode === null) return worker;
  const child = fork(path.join(process.cwd(), ...WORKER_PATH), [], {
    serialization: "advanced",
    stdio: ["ignore", "ignore", "inherit", "ipc"],
    execArgv: ["--max-old-space-size=256"],
  });
  try {
    if (child.pid) setPriority(child.pid, NICE);
  } catch {
    // Нет прав на смену приоритета (Windows без прав) — работаем как есть.
  }
  child.on("message", (reply: Reply) => {
    finish(reply.id, (job) => {
      if (reply.error === "unreadable") job.reject(new UnreadableImage(reply.message ?? "Не похоже на изображение"));
      else if (reply.error || !reply.body) job.reject(new Error(reply.message ?? "Перекодирование не удалось"));
      else job.resolve({
        body: Buffer.from(reply.body.buffer, reply.body.byteOffset, reply.body.byteLength),
        width: reply.width ?? 0,
        height: reply.height ?? 0,
        thumb: reply.thumb ? Buffer.from(reply.thumb.buffer, reply.thumb.byteOffset, reply.thumb.byteLength) : null,
        contentType: "image/webp",
      });
    });
  });
  child.on("exit", () => {
    if (worker === child) worker = null;
    failAllOf(child, "Процесс перекодирования завершился");
  });
  child.on("error", () => {
    if (worker === child) worker = null;
    failAllOf(child, "Процесс перекодирования не запустился");
  });
  worker = child;
  return child;
}

/** Остановить процесс перекодирования (тесты, завершение сайта). */
export function stopImageWorker(): void {
  worker?.kill();
  worker = null;
}

/**
 * Перекодировать картинку. Файлы обрабатываются строго по одному (в самом
 * процессе): 48-Мп HEIC в памяти — ~200 МБ, а сервер — 1 ГБ на всё.
 */
export function convertImage(input: Buffer, preset: ImagePreset): Promise<Converted> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    try {
      const child = ensureWorker();
      const timer = setTimeout(() => finish(id, (job) => job.reject(new Error("Перекодирование не уложилось во время"))), TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer, child });
      child.send({ id, input: new Uint8Array(input.buffer, input.byteOffset, input.byteLength), preset }, (error) => {
        if (error) finish(id, (job) => job.reject(error));
      });
    } catch (error) {
      reject(error as Error);
    }
  });
}
