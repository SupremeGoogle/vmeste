/**
 * Картинки витрины шаблонов: первый экран каждого образца (390 × 790 точек,
 * как экран телефона под строкой состояния) → public/media/template-previews/<id>.webp.
 *
 * Зачем: витрина раньше держала 23 живых фрейма — 23 полных приглашения со
 * шрифтами, фото и анимациями разом; на телефоне и планшете страница
 * грузилась десятки секунд. Картинка весит 30–60 КБ и грузится по мере
 * прокрутки, живой образец открывается по ссылке «Посмотреть макет».
 *
 * Запуск (нужен работающий `npm run dev` и Edge или Chrome):
 *   node scripts/template-previews.mjs [http://localhost:3000] [id ...]
 * Новый шаблон или правка обложки — перезапустить для этого id.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const base = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3000";
const only = process.argv.slice(2).filter((arg) => !arg.startsWith("http"));

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const browser = BROWSERS.find((file) => existsSync(file));
if (!browser) throw new Error("Нужен Edge или Chrome");

// Список шаблонов — из самого приложения (scripts/template-ids.ts): часть
// шаблонов собирается функциями, и поиск по тексту исходников их пропускал.
const all = JSON.parse(execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "scripts/template-ids.ts"], { encoding: "utf8", shell: process.platform === "win32" }).trim().split("\n").pop());
const ids = all.filter((id) => !only.length || only.includes(id));

const out = "public/media/template-previews";
mkdirSync(out, { recursive: true });
const tmp = path.join(tmpdir(), "vmeste-previews");
const MANIFEST = "src/lib/template-previews.json";
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
mkdirSync(tmp, { recursive: true });

// Edge в фоновом режиме на Windows не делает окно уже ~500 точек: страница
// раскладывалась на 500, а кадр обрезался до 390 — у имён срезался край.
// Поэтому телефон эмулируется по протоколу DevTools: 390 × 790, плотность 2×.
const PORT = 9333;
const edge = spawn(browser, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--no-first-run",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(tmp, "profile")}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json()).catch(() => null);
}
if (!target) throw new Error("Edge не открыл порт отладки");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let seq = 0;
const waiting = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) { waiting.get(message.id)(message); waiting.delete(message.id); }
});
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 790, deviceScaleFactor: 2, mobile: process.env.PREVIEW_MOBILE === "1" });
await send("Page.enable");

for (const id of ids) {
  await send("Page.navigate", { url: `${base}/templates/${id}?cover=1` });
  // Время на шрифты, картинки и входные анимации обложки.
  await sleep(Number(process.env.PREVIEW_WAIT_MS ?? 6000));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  if (!shot.result?.data) {
    console.log(`✗ ${id}: снимок не получился`);
    continue;
  }
  const png = Buffer.from(shot.result.data, "base64");
  const file = path.join(out, `${id}.webp`);
  await sharp(png).resize(400).webp({ quality: 74, effort: 6 }).toFile(file);
  // Цвет строки состояния над картинкой — средний цвет верхней полосы кадра.
  const { dominant } = await sharp(png).extract({ left: 0, top: 0, width: 780, height: 12 }).stats();
  manifest[id] = "#" + [dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, "0")).join("");
  console.log(`✓ ${id} — ${Math.round(statSync(file).size / 1024)} КБ`);
}
ws.close();
edge.kill();

writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + "\n");
console.log(`цвета строки состояния → ${MANIFEST}`);
