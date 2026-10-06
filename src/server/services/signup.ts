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
import type { GoogleProfile } from "@/server/auth/google";
import { notifySignup } from "@/server/notify/events";

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

/**
 * Пользователь для профиля Google (возврат от Google, api/auth/google/callback).
 *
 * Три случая: уже входил через Google — узнаём по `sub`; есть кабинет с той же
 * почтой — привязываем Google к нему, а не плодим второй; иначе заводим новый.
 * Привязка по почте безопасна, потому что Google подтвердил адрес
 * (`email_verified: false` отвергается ещё в auth/google.ts).
 */
export async function userForGoogleProfile(profile: GoogleProfile): Promise<string> {
  const existing = await db.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: profile.sub } },
    select: { userId: true },
  });

  let userId = existing?.userId ?? null;

  if (userId) {
    await db.oAuthAccount.update({
      where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: profile.sub } },
      data: { lastLogin: new Date(), email: profile.email },
    });
  } else {
    const byEmail = await db.user.findUnique({
      where: { email: profile.email },
      select: { id: true, avatarUrl: true, emailVerified: true },
    });

    if (byEmail) {
      userId = byEmail.id;
      // Кабинет заведён по почте, но почту так и не подтвердили — значит,
      // пароль мог придумать кто угодно, заняв адрес раньше хозяина. Google
      // подтвердил хозяина: чужой пароль и чужие сессии гасим, иначе
      // посторонний остался бы в склеенном кабинете.
      if (!byEmail.emailVerified) {
        await db.user.update({ where: { id: byEmail.id }, data: { passwordHash: null } });
        await db.session.deleteMany({ where: { userId: byEmail.id } });
        await db.emailToken.updateMany({ where: { userId: byEmail.id, usedAt: null }, data: { usedAt: new Date() } });
      }
      // Почту Google подтвердил — отмечаем это и у нас, а аватар ставим,
      // только если своего ещё нет: перезаписывать чужой выбор невежливо.
      await db.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          avatarUrl: byEmail.avatarUrl ?? profile.picture ?? null,
        },
      });
    } else {
      userId = await createAccount({
        name: profile.name,
        email: profile.email,
        emailVerified: true,
        avatarUrl: profile.picture,
      });
      notifySignup(profile.email, profile.name);
    }

    await db.oAuthAccount.create({
      data: {
        userId,
        provider: "GOOGLE",
        providerAccountId: profile.sub,
        email: profile.email,
      },
    });
  }

  return userId;
}
