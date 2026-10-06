/**
 * Поставить свои гифки на обложку шаблона «Винил».
 *
 *   node scripts/set-cover-gifs.mjs <url|файл> [ещё до трёх штук]
 *
 * Скрипт скачивает (или копирует) до трёх анимаций, кладёт их в
 * `public/media/invite-vinyl/` и переключает на них три плитки обложки
 * в `src/lib/invite-templates/vinyl-assets.ts`. Больше трёх обложка не
 * показывает — остальные будут проигнорированы.
 *
 * Если в системе есть ffmpeg, гифка заодно пережимается в анимированный
 * WebP: те же кадры весят втрое меньше, а в `<img>` ведут себя так же.
 * Нет ffmpeg — файл ложится как есть.
 *
 * Отменить: git checkout src/lib/invite-templates/vinyl-assets.ts
 *           и удалить лишние файлы из public/media/invite-vinyl.
 *
 * Права на то, что вы ставите, — ваша ответственность: кадры из фильмов
 * и мультфильмов принадлежат их правообладателям.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";

const MEDIA_DIR = "public/media/invite-vinyl";
const ASSETS_FILE = "src/lib/invite-templates/vinyl-assets.ts";
const MAX = 3;

const inputs = process.argv.slice(2).filter(Boolean);
if (inputs.length === 0) {
  console.error("Укажите до трёх ссылок или путей к файлам:\n  node scripts/set-cover-gifs.mjs https://…/one.gif ./two.gif");
  process.exit(1);
}

function hasFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function fetchTo(source, target) {
  if (!/^https?:\/\//i.test(source)) {
    copyFileSync(source, target);
    return;
  }
  const response = await fetch(source, {
    headers: {
      // Без узнаваемого user-agent часть хостингов отдаёт заглушку вместо файла.
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error(`${source} — ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

mkdirSync(MEDIA_DIR, { recursive: true });
const ffmpeg = hasFfmpeg();
const placed = [];

for (const [index, source] of inputs.slice(0, MAX).entries()) {
  const stem = `cover-${index + 1}`;
  const rawExt = extname(new URL(source, "file:///x/").pathname) || ".gif";
  const raw = join(MEDIA_DIR, `${stem}${rawExt}`);

  try {
    await fetchTo(source, raw);
  } catch (error) {
    console.error(`× ${basename(source)}: ${error.message}`);
    continue;
  }

  let final = raw;
  if (ffmpeg && rawExt.toLowerCase() === ".gif") {
    const webp = join(MEDIA_DIR, `${stem}.webp`);
    try {
      execFileSync("ffmpeg", [
        "-loglevel", "error", "-y", "-i", raw,
        "-vf", "scale=420:-2:flags=lanczos",
        "-loop", "0", "-c:v", "libwebp", "-q:v", "62", "-compression_level", "6",
        webp,
      ]);
      unlinkSync(raw);
      final = webp;
    } catch {
      console.warn(`  ffmpeg не справился с ${stem}${rawExt} — оставляю гифку как есть`);
    }
  }

  const size = (statSync(final).size / 1024).toFixed(0);
  placed.push(`/${final.replace(/\\/g, "/").replace(/^public\//, "")}`);
  console.log(`✓ ${basename(final)} — ${size} КБ`);
}

if (placed.length === 0) {
  console.error("Ни один файл не удалось получить — шаблон не тронут.");
  process.exit(1);
}

// Переписываем первые три пути в списке образцов: именно они стоят на
// плитках обложки (см. vinyl.ts). Остальные — галерея и место — остаются.
if (!existsSync(ASSETS_FILE)) {
  console.error(`Не найден ${ASSETS_FILE}`);
  process.exit(1);
}
const source = readFileSync(ASSETS_FILE, "utf8");
const paths = [...source.matchAll(/"(\/media\/[^"]+)"/g)].map((match) => match[1]);
if (paths.length < 5) {
  console.error("Список образцов выглядит не так, как ожидалось, — правьте вручную.");
  process.exit(1);
}
let next = source;
placed.forEach((path, index) => {
  next = next.replace(`"${paths[index]}"`, `"${path}"`);
});
writeFileSync(ASSETS_FILE, next);

console.log(`\nОбложка «Винила» теперь показывает: ${placed.join(", ")}`);
console.log("Перезапустите dev-сервер, откройте «Приглашение» → «Винил» и примените шаблон.");
console.log("Откатить: git checkout src/lib/invite-templates/vinyl-assets.ts");
