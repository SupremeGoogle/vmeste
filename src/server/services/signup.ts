/**
 * Создание кабинета: пользователь плюс его организация.
 *
 * Вынесено из страницы регистрации, потому что путей входа стало два —
 * форма с паролем и Google, — а заводить кабинет они обязаны одинаково.
 * Разойдись эти два места хоть на строчку, у половины пользователей не
 * оказалось бы организации, и панель встретила бы их пустым экраном без
 * объяснений.
 */
import { db } from "@/server/db";
import { slugify } from "@/lib/slugify";

/** Свободный адрес организации: «Студия Аня» → studiya-anya, -2, -3… */
export async function freeOrgSlug(name: string): Promise<string> {
  const base = slugify(name) || "studio";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await db.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
  }
  // Полсотни занятых однофамильцев — случай теоретический, но молча
  // отдавать занятый адрес нельзя: он уникален в базе.
  return `${base}-${Date.now().toString(36)}`;
}

export type NewAccount = {
  name: string;
  email: string;
  orgName?: string;
  passwordHash?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
};

/**
 * Заводит организацию и владельца в ней. Возвращает идентификатор
 * пользователя — вызывающему остаётся открыть сессию.
 */
export async function createAccount(input: NewAccount): Promise<string> {
  const orgName = input.orgName?.trim() || input.name;
  const slug = await freeOrgSlug(orgName);

  const org = await db.organization.create({
    data: {
      name: orgName,
      slug,
      members: {
        create: {
          role: "OWNER",
          user: {
            create: {
              email: input.email,
              name: input.name,
              passwordHash: input.passwordHash ?? null,
              emailVerified: input.emailVerified ?? false,
              avatarUrl: input.avatarUrl ?? null,
            },
          },
        },
      },
    },
    include: { members: true },
  });

  return org.members[0].userId;
}
