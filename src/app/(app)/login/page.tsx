/**
 * Вход организатора. Регистрации нет: пользователи заводятся сидом или вручную.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { googleEnabled } from "@/server/auth/google";
import { GoogleButton, OrRule } from "../_auth/google-button";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Подбор пароля: 10 попыток в 5 минут на адрес почты.
  if (!rateLimit(`login:${email}`, 10, 300_000).ok) {
    redirect("/login?error=rate");
  }

  const user = await db.user.findUnique({ where: { email } });
  // Проверяем пароль даже при отсутствии пользователя: иначе по времени
  // ответа можно узнать, какие адреса зарегистрированы.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$00$00").then(() => false);

  // Пользователь есть, но пароля у него нет: он заводил кабинет через
  // Google. «Неверный пароль» отправил бы его подбирать несуществующее,
  // поэтому говорим прямо. Да, это подтверждает, что кабинет с таким
  // адресом существует, — но ровно то же подтверждает и сам Google,
  // а человек, застрявший на форме входа, теряется навсегда.
  if (user && !user.passwordHash) redirect("/login?error=google_only");

  if (!user || !ok) redirect("/login?error=1");

  await createSession(user.id);
  redirect("/app");
}

const LOGIN_ERRORS: Record<string, string> = {
  rate: "Слишком много попыток, подождите.",
  google_only: "У этого адреса вход через Google — нажмите кнопку выше.",
  google_off: "Вход через Google пока не настроен.",
  google_cancel: "Вход через Google отменён.",
  google_state: "Ссылка входа устарела, начните заново.",
  google_fail: "Google не подтвердил вход. Попробуйте ещё раз.",
  default: "Неверная почта или пароль.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-24">
      <p className="text-center">
        <Link href="/" className="font-serif text-2xl tracking-wide">Вместе</Link>
      </p>
      <h1 className="mt-8 text-center text-3xl">Вход</h1>
      <p className="mt-2 text-center text-sm text-stone-600">Панель организатора</p>
      <div className="mx-auto my-7 h-px w-12 bg-stone-200" />

      {googleEnabled() && (
        <>
          <GoogleButton label="Войти через Google" />
          <OrRule />
        </>
      )}

      <form action={login} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-stone-600" htmlFor="email">Почта</label>
          <input
            id="email" name="email" type="email" required autoComplete="username"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="password">Пароль</label>
          <input
            id="password" name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-700">{LOGIN_ERRORS[error] ?? LOGIN_ERRORS.default}</p>}

        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">
          Войти
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        Ещё нет кабинета? <Link href="/register" className="underline">Создать</Link>
      </p>
    </main>
  );
}
