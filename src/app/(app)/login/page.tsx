/**
 * Вход организатора. Регистрации нет: пользователи заводятся сидом или вручную.
 */
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";

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

  if (!user || !ok) redirect("/login?error=1");

  await createSession(user.id);
  redirect("/app");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold">Вход</h1>
      <p className="mt-2 text-sm text-stone-600">Панель организатора</p>

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

        {error && (
          <p className="text-sm text-red-700">
            {error === "rate" ? "Слишком много попыток, подождите." : "Неверная почта или пароль."}
          </p>
        )}

        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">
          Войти
        </button>
      </form>
    </main>
  );
}
