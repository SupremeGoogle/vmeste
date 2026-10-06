/**
 * Отдельный процесс перекодирования картинок (sharp/libvips, HEIC через WASM).
 *
 * Зачем отдельно: у сервера одно ядро на три сайта. Нагрузочный тест
 * 6 октября 2026 показал, что 10 фото разом внутри сайта забирают процессор
 * у страниц — именные приглашения и анкета отвечали по 10–20 секунд. Здесь
 * фото обрабатываются с пониженным приоритетом (nice ставит родитель,
 * src/server/images/convert.ts): страницы получают процессор первыми, фото —
 * всё оставшееся. Процесс запускается при первом фото и сам закрывается
 * после IMAGES_IDLE_MS без работы.
 *
 * Протокол (IPC, сериализация "advanced"):
 *   ← { id, input: Uint8Array, preset }
 *   → { id, body, width, height, thumb }  или  { id, error: "unreadable" | "failed", message }
 */
import sharp from "sharp";

const IDLE_MS = Number(process.env.IMAGES_IDLE_MS ?? 90_000);
const ANIMATED_MAX_SIDE = 1200;
/** Больше — это уже не фото, а попытка съесть память. 70 Мп пропускают 48-Мп айфон. */
const MAX_PIXELS = 70_000_000;

// Кеш libvips держит недавние файлы ради повторных операций, а у нас каждый
// файл обрабатывается один раз; одна рабочая нить — сервер одноядерный.
sharp.cache(false);
sharp.concurrency(1);

class UnreadableImage extends Error {}

async function convert(input, preset) {
  const { image, animated } = await open(input, preset.animated);
  const maxSide = animated ? Math.min(preset.maxSide, ANIMATED_MAX_SIDE) : preset.maxSide;
  const resized = image.resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true });

  // Обычное фото: декодируем и уменьшаем один раз, фото и превью кодируем из
  // готовых пикселей; WebP effort 2 без smartSubsample — в 3–4,5 раза
  // быстрее прежнего при весе +5 % и том же виде (замер 6 октября 2026).
  if (!animated) {
    const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });
    const pixels = { raw: { width: info.width, height: info.height, channels: info.channels } };
    const [body, thumb] = await Promise.all([
      sharp(data, pixels).webp({ quality: preset.quality, alphaQuality: 90, effort: 2 }).toBuffer(),
      preset.thumb
        ? sharp(data, pixels)
            .resize({ width: preset.thumb.maxSide, height: preset.thumb.maxSide, fit: "inside", withoutEnlargement: true })
            .webp({ quality: preset.thumb.quality, effort: 2 })
            .toBuffer()
        : Promise.resolve(null),
    ]);
    return { body, width: info.width, height: info.height, thumb };
  }

  const [main, thumb] = await Promise.all([
    resized.clone().webp({ quality: preset.quality, alphaQuality: 90, effort: 4, smartSubsample: true }).toBuffer({ resolveWithObject: true }),
    preset.thumb
      ? resized.clone()
          .resize({ width: preset.thumb.maxSide, height: preset.thumb.maxSide, fit: "inside", withoutEnlargement: true })
          .webp({ quality: preset.thumb.quality, effort: 4 })
          .toBuffer()
      : Promise.resolve(null),
  ]);
  // У анимации sharp отдаёт высоту всей ленты кадров.
  return { body: main.data, width: main.info.width, height: main.info.pageHeight ?? main.info.height, thumb };
}

async function open(input, allowAnimation) {
  const meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata().catch(() => null);

  // SVG — это документ, а не фото: со ссылками, шрифтами и скриптами.
  if (meta?.format === "svg") throw new UnreadableImage("SVG не принимаем");

  if (meta && !(meta.format === "heif" && meta.compression === "hevc")) {
    const animated = allowAnimation && (meta.pages ?? 1) > 1;
    // Обрезанный на полпути JPEG (гость потерял связь) — всё равно кадр:
    // пусть с серой полосой внизу, но лучше, чем отказ.
    const image = sharp(input, { animated, limitInputPixels: MAX_PIXELS, failOn: "none" }).rotate().toColorspace("srgb");
    return { image, animated };
  }

  // HEIC (HEVC) готовые сборки libvips не декодируют — патенты; libheif в
  // WASM сам применяет поворот из контейнера, поэтому rotate() не нужен.
  if (meta?.format === "heif" || looksLikeHeif(input)) {
    if (meta?.width && meta?.height && meta.width * meta.height > MAX_PIXELS) throw new UnreadableImage("Слишком большое разрешение");
    try {
      const { default: decodeHeic } = await import("heic-decode");
      const decoded = await decodeHeic({ buffer: input });
      const image = sharp(Buffer.from(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength), {
        raw: { width: decoded.width, height: decoded.height, channels: 4 },
        limitInputPixels: MAX_PIXELS,
      });
      return { image, animated: false };
    } catch {
      throw new UnreadableImage("Не удалось прочитать HEIC");
    }
  }

  throw new UnreadableImage("Не похоже на изображение");
}

/** Контейнер ISO BMFF с «картинкой» внутри: `....ftypheic`, `ftypmif1` и т. п. */
function looksLikeHeif(input) {
  if (input.length < 12 || input.toString("latin1", 4, 8) !== "ftyp") return false;
  return ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"].includes(input.toString("latin1", 8, 12));
}

let idleTimer = null;
function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => process.exit(0), IDLE_MS);
}

// Строго по одному: 48-Мп HEIC в памяти — ~200 МБ, сервер — 1 ГБ на всё.
let chain = Promise.resolve();
process.on("message", (message) => {
  armIdle();
  chain = chain.then(async () => {
    try {
      const input = Buffer.from(message.input.buffer, message.input.byteOffset, message.input.byteLength);
      const out = await convert(input, message.preset);
      process.send({ id: message.id, ...out });
    } catch (error) {
      process.send({ id: message?.id, error: error instanceof UnreadableImage ? "unreadable" : "failed", message: String(error?.message ?? error) });
    }
    armIdle();
  });
});

// Родитель ушёл (перезапуск сайта) — уходим и мы.
process.on("disconnect", () => process.exit(0));
armIdle();
