/**
 * Локальный dev-хелпер: меняет логин/пароль засеянного организатора
 * на предельно простые (1 / 1) — только для локальной разработки.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hashPassword("1");
  const user = await db.user.update({
    where: { email: "planner@example.com" },
    data: { email: "1@1", passwordHash },
  });
  console.log("Готово:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
