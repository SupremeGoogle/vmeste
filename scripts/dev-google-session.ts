/**
 * Локальный dev-хелпер: связывает засеянного организатора с "гугл"-профилем
 * (как будто он вошёл через Google) и заводит для него сессию напрямую,
 * без прогона настоящего OAuth-флоу.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { randomBytes } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2] ?? "planner@example.com";
  const user = await db.user.findUniqueOrThrow({ where: { email } });

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      avatarUrl: "https://lh3.googleusercontent.com/a/default-user=s96-c",
    },
  });

  await db.oAuthAccount.upsert({
    where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: "dev-google-fake-sub-1" } },
    create: {
      userId: user.id,
      provider: "GOOGLE",
      providerAccountId: "dev-google-fake-sub-1",
      email: user.email,
    },
    update: { lastLogin: new Date() },
  });

  const expiresAt = new Date(Date.now() + 30 * 86_400_000);
  const session = await db.session.create({
    data: { id: randomBytes(24).toString("base64url"), userId: user.id, expiresAt },
  });

  console.log("SESSION_ID=" + session.id);
  console.log("USER_EMAIL=" + user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
