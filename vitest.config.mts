import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.spec.ts"],
    environment: "node",
    // Тесты ходят в общую базу — параллельные файлы затирали бы друг друга.
    fileParallelism: false,
    testTimeout: 20_000,
    env: { NODE_ENV: "test" },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
