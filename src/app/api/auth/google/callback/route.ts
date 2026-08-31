/**
 * Возвращение от Google.
 *
 * Три случая, и все три обязаны сработать одинаково предсказуемо:
 *   — человек уже входил через Google → узнаём по `sub` и пускаем;
 *   — у него есть кабинет с такой же почтой (заводил паролем) →
 *     привязываем Google к существующему пользователю, а не плодим второй;
 *   — человека нет → заводим кабинет с организацией, как при регистрации.
 *
 * Привязка по почте безопасна ровно потому, что Google подтверждает адрес,
 * и токен с `email_verified: false` мы отвергаем ещё в `auth/google.ts`.
 */
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { exchangeCode, sameSecret } from "@/server/auth/google";
import { createSession } from "@/server/auth/session";
import { createAccount } from "@/server/services/signup";
import { HANDSHAKE_COOKIE } from "../start/route";

export const dynamic = "force-dynamic";

function back(error: string): Response {
  const url = new URL("/login", process.env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("error", error);
  return Response.redirect(url);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const handshake = jar.get(HANDSHAKE_COOKIE)?.value ?? "";
  // Cookie одноразовая: удаляем её в любом исходе, чтобы повтор запроса
  // с тем же кодом ничего не дал.
  jar.delete(HANDSHAKE_COOKIE);

  // Человек нажал «Отмена» в окне Google — это не ошибка, а решение.
  if (params.get("error")) return back("google_cancel");

  const code = params.get("code") ?? "";
  const state = params.get("state") ?? "";
  const [savedState, verifier] = handshake.split(".");

  if (!code || !savedState || !verifier || !sameSecret(state, savedState)) {
    return back("google_state");
  }

  let profile;
  try {
    profile = await exchangeCode(code, verifier);
  } catch {
    return back("google_fail");
  }

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
      select: { id: true, avatarUrl: true },
    });

    if (byEmail) {
      userId = byEmail.id;
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

  await createSession(userId);
  return Response.redirect(new URL("/app", process.env.NEXT_PUBLIC_APP_URL));
}
