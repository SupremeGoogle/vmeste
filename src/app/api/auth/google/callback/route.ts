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
import { userForGoogleProfile } from "@/server/services/signup";
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
  // В cookie до трёх незавершённых входов ("state.verifier|…") — берём свой.
  const match = handshake.split("|").map((pair) => pair.split(".")).find(([saved, verifier]) => saved && verifier && sameSecret(state, saved));
  const verifier = match?.[1];

  if (!code || !verifier) {
    return back("google_state");
  }

  let profile;
  try {
    profile = await exchangeCode(code, verifier);
  } catch {
    return back("google_fail");
  }

  const userId = await userForGoogleProfile(profile);

  // Заблокирован в панели суперадмина — Google подтвердил личность, но входа нет.
  const blocked = await db.user.findUnique({ where: { id: userId }, select: { blockedAt: true } });
  if (blocked?.blockedAt) return back("blocked");

  await createSession(userId);
  return Response.redirect(new URL("/app", process.env.NEXT_PUBLIC_APP_URL));
}
