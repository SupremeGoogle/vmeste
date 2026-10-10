/** Тесты чистят базу — без отдельного адреса они не должны запускаться вовсе. */
import { describe, expect, it } from "vitest";
import { testDatabaseUrl } from "@/server/test-database-url";

const APP = "postgresql://postgres:x@127.0.0.1:5433/vmeste_dev";

describe("адрес тестовой базы", () => {
  it("без TEST_DATABASE_URL прогон останавливается, а не берёт рабочую базу", () => {
    expect(() => testDatabaseUrl({ DATABASE_URL: APP })).toThrow(/TEST_DATABASE_URL не задан/);
  });

  it("тот же адрес под другим именем хоста или с параметрами — тоже стоп", () => {
    expect(() => testDatabaseUrl({ DATABASE_URL: APP, TEST_DATABASE_URL: "postgresql://other:y@localhost:5433/vmeste_dev?schema=public" }))
      .toThrow(/ту же базу/);
  });

  it("отдельная база проходит", () => {
    const test = "postgresql://postgres:x@127.0.0.1:5433/vmeste_test";
    expect(testDatabaseUrl({ DATABASE_URL: APP, TEST_DATABASE_URL: test })).toBe(test);
  });
});
