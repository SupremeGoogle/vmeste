/**
 * Фильтр 18+: модель в отдельном процессе действительно отвечает числом,
 * засыпает после простоя (память сервера — 1 ГБ) и просыпается снова.
 *
 * Откровенных картинок в репозитории нет и не будет, поэтому здесь
 * проверяется только нижняя граница — обычный кадр не помечается.
 */
import { afterAll, describe, expect, it } from "vitest";
import sharp from "sharp";

// Короткий простой — чтобы проверить засыпание за секунды, а не за полторы минуты.
process.env.NSFW_IDLE_MS = "1500";
const { NSFW_FLAG, nsfwPending, nsfwScore, nsfwWorkerRunning, stopNsfwWorker } = await import("@/server/images/nsfw");

const plain = (background: string) =>
  sharp({ create: { width: 480, height: 360, channels: 3, background } }).webp().toBuffer();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterAll(() => stopNsfwWorker());

describe("оценка 18+", () => {
  it("обычный кадр получает низкую оценку", async () => {
    const score = await nsfwScore(await plain("#8a9"));
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(0);
    expect(score!).toBeLessThan(NSFW_FLAG);
  }, 30_000);

  it("параллельные проверки все получают ответ", async () => {
    const images = await Promise.all(["#a00", "#0a0", "#00a", "#aaa", "#555", "#fed"].map(plain));
    const scores = await Promise.all(images.map((image) => nsfwScore(image)));
    expect(scores.every((score) => typeof score === "number" && score < NSFW_FLAG)).toBe(true);
  }, 30_000);

  it("после простоя процесс засыпает и освобождает память, потом просыпается", async () => {
    await nsfwScore(await plain("#123"));
    expect(nsfwWorkerRunning()).toBe(true);
    await wait(3000);
    expect(nsfwWorkerRunning()).toBe(false);
    expect(await nsfwScore(await plain("#321"))).not.toBeNull();
    expect(nsfwWorkerRunning()).toBe(true);
  }, 30_000);

  it("убитый процесс — не падение: фото уходит на ручную проверку, следующее оценивается", async () => {
    const image = await plain("#456");
    const pending = nsfwScore(image);
    // Ждём, пока проверка уйдёт в процесс, и роняем его посреди работы.
    while (nsfwPending() === 0) await wait(5);
    stopNsfwWorker();
    expect(await pending).toBeNull();
    expect(typeof (await nsfwScore(image))).toBe("number");
  }, 30_000);

  it("не картинка — не падение, а пустая оценка", async () => {
    expect(await nsfwScore(Buffer.from("not an image"))).toBeNull();
  });
});
