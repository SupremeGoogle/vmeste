/**
 * Отдельный процесс оценки «18+» (NSFWJS MobileNetV2Mid на WASM).
 *
 * Живёт отдельно от сайта, чтобы модель не занимала память сервера
 * постоянно: процесс запускается при первом фото (src/server/images/nsfw.ts)
 * и сам завершается после NSFW_IDLE_MS без работы. Упадёт или съест память —
 * упадёт он, а не сайт.
 *
 * Протокол (IPC, сериализация "advanced"):
 *   ← { id, pixels: Uint8Array(224·224·3) }   картинка уже уменьшена родителем
 *   → { id, score }  или  { id, error }
 */
const SIZE = 224;
const IDLE_MS = Number(process.env.NSFW_IDLE_MS ?? 90_000);

let modelPromise = null;
let idleTimer = null;

async function model() {
  modelPromise ??= (async () => {
    const tf = await import("@tensorflow/tfjs");
    await import("@tensorflow/tfjs-backend-wasm");
    await tf.setBackend("wasm");
    await tf.ready();
    const nsfwjs = await import("nsfwjs");
    // Mid точнее базовой MobileNetV2 при почти той же памяти (~95 МБ).
    return { tf, classifier: await nsfwjs.load("MobileNetV2Mid") };
  })();
  return modelPromise;
}

function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => process.exit(0), IDLE_MS);
}

/** Вероятность откровенного: Porn + Hentai. Sexy (декольте, купальник) не в счёт. */
async function score(pixels) {
  const { tf, classifier } = await model();
  const input = tf.tensor3d(Int32Array.from(pixels), [SIZE, SIZE, 3], "int32");
  try {
    const predictions = await classifier.classify(input, 5);
    const p = (name) => predictions.find((item) => item.className === name)?.probability ?? 0;
    return Math.min(1, p("Porn") + p("Hentai"));
  } finally {
    input.dispose();
  }
}

// Сообщения обрабатываются строго по одному — пик памяти не растёт с очередью.
let chain = Promise.resolve();
process.on("message", (message) => {
  armIdle();
  chain = chain.then(async () => {
    try {
      if (!message?.pixels || message.pixels.length !== SIZE * SIZE * 3) throw new Error("bad pixels");
      process.send({ id: message.id, score: await score(message.pixels) });
    } catch (error) {
      process.send({ id: message?.id, error: String(error?.message ?? error) });
    }
    armIdle();
  });
});

// Родитель ушёл (перезапуск сайта) — уходим и мы.
process.on("disconnect", () => process.exit(0));
armIdle();
