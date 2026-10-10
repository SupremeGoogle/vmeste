/**
 * Тестовая база отдельная от dev: тесты чистят данные под собой,
 * а терять наполнение для ручной проверки не хочется.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { testDatabaseUrl } from "@/server/test-database-url";

const connectionString = testDatabaseUrl();

export const testDb = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

export async function resetDb() {
  await testDb.organization.deleteMany({});
  await testDb.user.deleteMany({});
}
