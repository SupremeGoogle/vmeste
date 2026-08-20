/**
 * Рейт-лимит поиска на входе.
 *
 * Реализация в памяти процесса: инстанс один (PLAN.md §4.2), счётчик теряется
 * при перезапуске — и это приемлемо. Интерфейс отдельный, чтобы на Redis
 * можно было переехать заменой одного файла.
 *
 * Смысл лимита не в нагрузке (150 сканов за 10 минут — это 0,25 запроса
 * в секунду), а в том, чтобы знание короткого кода нельзя было превратить
 * в перебор списка гостей.
 */
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Раз в 5 минут выбрасываем протухшие ключи, чтобы карта не росла вечно. */
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 300_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true };
}

/** Только для тестов. */
export function resetRateLimits() {
  buckets.clear();
}
