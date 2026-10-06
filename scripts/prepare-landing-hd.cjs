/** Convert genuine 2x local captures without introducing another lossy encode. */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS-скрипт, запускается node напрямую */
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const directory = path.resolve("public/media/feature-screens");
const screens = [
  { name: "guest-entry-phone-hd", route: "/g/487SRP", width: 780, height: 1560, cssWidth: 390 },
  { name: "seating-filled-hd", route: "/app/e/cmuv6e3rc0000moww7i7uxq4x/seating", width: 2560, height: 2080, cssWidth: 1280 },
];

async function main() {
  for (const screen of screens) {
    const original = path.join(directory, `${screen.name}-original.jpg`);
    const metadata = await sharp(original).metadata();
    if (metadata.width !== screen.width || metadata.height < screen.height) throw new Error(`Capture dimensions do not match: ${screen.name}`);
    await sharp(original).extract({ left: 0, top: 0, width: screen.width, height: screen.height }).webp({ lossless: true, effort: 6 }).toFile(path.join(directory, `${screen.name}.webp`));
  }
  const manifestPath = path.join(directory, "capture-manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  manifest.hdCapture = {
    capturedAt: new Date().toISOString(),
    method: "Real pages in a same-origin iframe rendered with CSS zoom:2 through a development-only localhost capture canvas. Browser full-page screenshots; top crop and lossless WebP conversion. No generated UI or enlargement of earlier screenshots.",
    screens,
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log("Two genuine HD previews prepared");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
