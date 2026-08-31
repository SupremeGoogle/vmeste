/**
 * Регистрация организатора.
 *
 * Раньше пользователей заводил сид: сервис показывали лично, и вход выдавали
 * руками. С публичной титульной страницы так нельзя — человек, который
 * прочитал «попробовать», должен закончить попытку в своей панели, а не в
 * письме «напишите нам».
 *
 * Вместе с пользователем создаётся организация: мероприятия принадлежат ей,
 * а не человеку, — чтобы завтра к свадьбе можно было позвать помощницу,
 * не передавая пароль.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { googleEnabled } from "@/server/auth/google";
import { createAccount } from "@/server/services/signup";
import { GoogleButton, OrRule } from "../_auth/google-button";

export const dynamic = "force-dynamic";

const MIN_PASSWORD = 8;

async function register(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim() || name;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) redirect("/register?error=fields");
  if (password.length < MIN_PASSWORD) redirect("/register?error=short");

  // Регистрация дешёвая для нас и удобная для скрипта: 5 попыток в час
  // на адрес почты.
  if (!rateLimit(`register:${email}`, 5, 3_600_000).ok) redirect("/register?error=rate");

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) redirect("/register?error=taken");

  const userId = await createAccount({
    name,
    orgName,
    email,
    passwordHash: await hashPassword(password),
  })
    // Гонка двух одинаковых регистраций: почта уникальна в базе, и это
    // последняя линия обороны. Ответ человеку тот же, что и при проверке выше.
    .catch(() => null);

  if (!userId) redirect("/register?error=taken");

  await createSession(userId);
  redirect("/app");
}

const ERRORS: Record<string, string> = {
  fields: "Заполните имя и почту.",
  short: `Пароль короче ${MIN_PASSWORD} символов.`,
  rate: "Слишком много попыток, попробуйте через час.",
  taken: "На эту почту уже есть аккаунт. Попробуйте войти.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <p className="text-center">
        <Link href="/" className="font-serif text-2xl tracking-wide">Вместе</Link>
      </p>
      <h1 className="mt-8 text-center text-3xl">Создать кабинет</h1>
      <p className="mt-2 text-center text-sm text-stone-600">
        Бесплатно, первая свадьба целиком
      </p>
      <div className="mx-auto my-7 h-px w-12 bg-stone-200" />

      {googleEnabled() && (
        <>
          <GoogleButton label="Продолжить с Google" />
          <OrRule />
        </>
      )}

      <form action={register} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-600" htmlFor="name">Как вас зовут</label>
          <input
            id="name" name="name" required autoComplete="name" maxLength={80}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="orgName">
            Название студии <span className="text-stone-400">— необязательно</span>
          </label>
          <input
            id="orgName" name="orgName" autoComplete="organization" maxLength={80}
            placeholder="Можно оставить пустым"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </div>
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
            id="password" name="password" type="password" required minLength={MIN_PASSWORD}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
          <p className="mt-1 text-xs text-stone-500">Не короче {MIN_PASSWORD} символов.</p>
        </div>

        {error && <p className="text-sm text-red-700">{ERRORS[error] ?? "Не получилось, попробуйте ещё раз."}</p>}

        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">
          Создать кабинет
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        Уже есть аккаунт? <Link href="/login" className="underline">Войти</Link>
      </p>
    </main>
  );
}
