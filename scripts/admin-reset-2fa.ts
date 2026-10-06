/**
 * Аварийный сброс второго фактора панели суперадмина — с сервера, когда
 * потеряны и телефон, и резервные коды:
 *
 *   npm run admin:reset-2fa -- akbarchik0071@gmail.com
 *
 * Запускается только там, где есть доступ к базе (SSH на сервер), — то
 * есть тот, кто это может, и так владеет всем. Сброс пишется в журнал.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("Укажите почту: npm run admin:reset-2fa -- почта@пример.рф");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`Пользователь ${email} не найден`);
  await db.adminSecret.deleteMany({ where: { userId: user.id } });
  await db.session.updateMany({ where: { userId: user.id }, data: { adminUntil: null } });
  await db.adminAudit.create({ data: { actorId: null, actorEmail: "console", action: "admin.2fa_reset", targetType: "user", targetId: user.id, detail: { email, via: "script" } } });
  console.log(`2FA для ${email} сброшена. При следующем входе в /admin её нужно настроить заново.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
