/**
 * Адрес тестовой базы. Тесты стирают организации и пользователей целиком
 * (tests/helpers/db.ts), поэтому подставлять вместо неё DATABASE_URL нельзя:
 * забытый TEST_DATABASE_URL означал бы очистку рабочей базы. Без отдельного
 * адреса, или если он указывает на ту же базу, прогон останавливается.
 */
export function testDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const test = env.TEST_DATABASE_URL;
  if (!test) {
    throw new Error("TEST_DATABASE_URL не задан: тесты очищают базу и без отдельного адреса не запускаются.");
  }
  if (env.DATABASE_URL && sameDatabase(test, env.DATABASE_URL)) {
    throw new Error("TEST_DATABASE_URL указывает на ту же базу, что DATABASE_URL: тесты стёрли бы её данные.");
  }
  return test;
}

function sameDatabase(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    const port = (url: URL) => url.port || "5432";
    const host = (url: URL) => url.hostname.replace(/^localhost$|^\[::1\]$/, "127.0.0.1");
    return host(left) === host(right) && port(left) === port(right) && left.pathname === right.pathname;
  } catch {
    return a === b;
  }
}
