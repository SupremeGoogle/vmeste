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
 */
import sharp, { type Sharp } from "sharp";
import decodeHeic from "heic-decode";

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
const ANIMATED_MAX_SIDE = 1200;

/**
 * Больше — это уже не фото, а попытка съесть память сервера. 70 Мп
 * пропускают 48-мегапиксельный кадр айфона с запасом.
 */
const MAX_PIXELS = 70_000_000;

// Кеш libvips держит в памяти недавние файлы ради повторных операций, а
// у нас каждый файл обрабатывается один раз. На сервере в 1 ГБ эти
// сотни мегабайт нужнее Next и Postgres.
sharp.cache(false);

export type Converted = {
  body: Buffer;
  width: number;
  height: number;
  thumb: Buffer | null;
  contentType: "image/webp";
};

export class UnreadableImage extends Error {}

/**
 * Файлы перекодируются строго по одному: 48-мегапиксельный HEIC в памяти —
 * это ~200 МБ, а сервер — 1 ГБ на всё. Сотня гостей после первого танца
 * иначе уронила бы его разом; в очереди же каждый ждёт меньше секунды.
 */
const MAX_PARALLEL = 1;
let running = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await task();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export function convertImage(input: Buffer, preset: ImagePreset): Promise<Converted> {
  return withSlot(() => convert(input, preset));
}

async function convert(input: Buffer, preset: ImagePreset): Promise<Converted> {
  const { image, animated } = await open(input, preset.animated);
  const maxSide = animated ? Math.min(preset.maxSide, ANIMATED_MAX_SIDE) : preset.maxSide;

  const resized = image.resize({
    width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true,
  });

  const [main, thumb] = await Promise.all([
    resized.clone()
      .webp({ quality: preset.quality, alphaQuality: 90, effort: 4, smartSubsample: true })
      .toBuffer({ resolveWithObject: true }),
    preset.thumb
      ? resized.clone()
          .resize({
            width: preset.thumb.maxSide, height: preset.thumb.maxSide,
            fit: "inside", withoutEnlargement: true,
          })
          .webp({ quality: preset.thumb.quality, effort: 4 })
          .toBuffer()
      : Promise.resolve(null),
  ]);

  return {
    body: main.data,
    width: main.info.width,
    // У анимации sharp отдаёт высоту всей ленты кадров.
    height: main.info.pageHeight ?? main.info.height,
    thumb,
    contentType: "image/webp",
  };
}

async function open(input: Buffer, allowAnimation: boolean): Promise<{ image: Sharp; animated: boolean }> {
  const meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata().catch(() => null);

  // SVG — это документ, а не фото: со ссылками, шрифтами и скриптами.
  if (meta?.format === "svg") throw new UnreadableImage("SVG не принимаем");

  if (meta && !(meta.format === "heif" && meta.compression === "hevc")) {
    const animated = allowAnimation && (meta.pages ?? 1) > 1;
    const image = sharp(input, {
      animated,
      limitInputPixels: MAX_PIXELS,
      // Обрезанный на полпути JPEG (гость потерял связь) — всё равно кадр:
      // пусть с серой полосой внизу, но лучше, чем отказ.
      failOn: "none",
    })
      .rotate()
      .toColorspace("srgb");
    return { image, animated };
  }

  if (meta?.format === "heif" || looksLikeHeif(input)) {
    if (meta?.width && meta?.height && meta.width * meta.height > MAX_PIXELS) {
      throw new UnreadableImage("Слишком большое разрешение");
    }
    try {
      // libheif сам применяет поворот из контейнера (irot/imir),
      // поэтому `rotate()` здесь не нужен.
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
function looksLikeHeif(input: Buffer): boolean {
  if (input.length < 12 || input.toString("latin1", 4, 8) !== "ftyp") return false;
  const brand = input.toString("latin1", 8, 12);
  return ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"].includes(brand);
}
