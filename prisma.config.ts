// Prisma 7 вынес строку подключения из schema.prisma сюда.
// Клиент подключается через driver adapter (см. src/server/db.ts),
// а CLI (migrate/studio) берёт URL отсюда.
import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
