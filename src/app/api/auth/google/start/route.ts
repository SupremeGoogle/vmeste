/**
 * Начало входа через Google: генерируем state и PKCE, кладём их в
 * короткоживущую cookie и отправляем человека к Google.
 *
 * Маршрут, а не серверное действие, потому что это обычный редирект
 * браузера по ссылке — на странице входа кнопка должна работать и без
 * JavaScript.
 */
import { cookies } from "next/headers";
import { beginAuth, googleEnabled } from "@/server/auth/google";
import { cookieSecure } from "@/server/auth/cookies";

export const dynamic = "force-dynamic";

export const HANDSHAKE_COOKIE = "vmeste_oauth";

export async function GET() {
  if (!googleEnabled()) {
    return Response.redirect(new URL("/login?error=google_off", process.env.NEXT_PUBLIC_APP_URL));
  }

  const { url, state, verifier } = beginAuth();

  const jar = await cookies();
  jar.set(HANDSHAKE_COOKIE, `${state}.${verifier}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    // Десять минут: столько человек может выбирать аккаунт и вводить пароль.
    // Дольше держать нечего — это одноразовый секрет одного входа.
    maxAge: 600,
  });

  return Response.redirect(url);
}
