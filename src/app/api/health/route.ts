/**
 * Жив ли сайт — для внешнего мониторинга (Sentry Uptime, UptimeRobot и т. п.).
 *
 * 200 — всё хорошо; 503 — база или хранилище не отвечают, и монитор
 * поднимает тревогу. Ответ без подробностей конфигурации: адрес открытый.
 */
import { db } from "@/server/db";
import { storageReachable } from "@/server/storage/s3";

export const dynamic = "force-dynamic";

async function timed<T>(work: () => Promise<T>): Promise<{ ok: boolean; ms: number }> {
  const started = Date.now();
  try {
    const result = await work();
    return { ok: result !== false, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

export async function GET() {
  const [database, storage] = await Promise.all([
    timed(() => Promise.race([db.$queryRaw`SELECT 1`, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))])),
    timed(() => storageReachable()),
  ]);
  const ok = database.ok && storage.ok;
  return Response.json(
    { ok, database, storage, uptimeSec: Math.round(process.uptime()), at: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
