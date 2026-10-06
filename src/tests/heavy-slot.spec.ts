/** Очередь тяжёлой работы: по одному, лишние — «сервер занят», ошибка не клинит очередь. */
import { describe, expect, it } from "vitest";
import { ServerBusyError, withHeavySlot } from "@/server/heavy";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("очередь тяжёлой работы", () => {
  it("выполняет строго по одному и отказывает сверх очереди", async () => {
    let running = 0;
    let peak = 0;
    const job = () => withHeavySlot("t1", async () => {
      running++; peak = Math.max(peak, running);
      await wait(20);
      running--;
      return "ok";
    }, 2);
    const results = await Promise.allSettled([job(), job(), job(), job(), job()]);
    expect(peak).toBe(1);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(2);
    expect(rejected[0].reason).toBeInstanceOf(ServerBusyError);
  });

  it("упавшая задача освобождает место следующей", async () => {
    await expect(withHeavySlot("t2", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(withHeavySlot("t2", async () => 42)).resolves.toBe(42);
  });
});
