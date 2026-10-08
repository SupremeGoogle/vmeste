import { BrandLogo } from "@/components/brand";
/**
 * Вход организатора: Google или почта с паролем. Пароль работает только
 * после подтверждения почты (services/email-auth.ts).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { googleEnabled } from "@/server/auth/google";
import { emailConfigured } from "@/server/email/send";
import { GoogleButton, OrRule } from "../_auth/google-button";
import { cookies } from "next/headers";
import { LangSwitch } from "@/components/lang-switch";
import { LANG_COOKIE, parseLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Язык страницы: ?lang= (ссылки с /en), затем выбор посетителя в cookie. */
async function pageLang(lang?: string): Promise<Lang> {
  return parseLang(lang) ?? parseLang((await cookies()).get(LANG_COOKIE)?.value) ?? "ru";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = await pageLang((await searchParams).lang);
  return lang === "en"
    ? { title: { absolute: "Sign in — Vmeste" }, description: "Sign in to your Vmeste account to plan your wedding.", alternates: { canonical: "/login" } }
    : { title: "Вход", description: "Вход в кабинет организатора свадьбы в сервисе «Вместе».", alternates: { canonical: "/login" } };
}

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Английская версия страницы сохраняет язык и в адресах с ошибкой.
  const q = formData.get("lang") === "en" ? "&lang=en" : "";

  // Подбор пароля: 10 попыток в 5 минут на адрес почты.
  if (!rateLimit(`login:${email}`, 10, 300_000).ok) {
    redirect(`/login?error=rate${q}`);
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
  if (user && !user.passwordHash) redirect(`/login?error=google_only${q}`);

  if (!user || !ok) redirect(`/login?error=1${q}`);
  // Пароль верный, но почту не подтвердили: кабинет ещё не открыт. Сообщаем
  // только после верного пароля — так это не выдаёт, чьи адреса у нас есть.
  if (!user.emailVerified) redirect(`/register/check?email=${encodeURIComponent(email)}&unverified=1${q}`);
  // Заблокирован в панели суперадмина — пароль верный, но входа нет.
  if (user.blockedAt) redirect(`/login?error=blocked${q}`);

  await createSession(user.id);
  redirect("/app");
}

const LOGIN_ERRORS: Record<string, string> = {
  rate: "Слишком много попыток, подождите.",
  blocked: "Доступ к кабинету закрыт. Напишите в поддержку.",
  google_only: "У этого адреса вход через Google — нажмите кнопку выше.",
  google_off: "Вход через Google пока не настроен.",
  google_cancel: "Вход через Google отменён.",
  google_state: "Ссылка входа устарела, начните заново.",
  google_fail: "Google не подтвердил вход. Попробуйте ещё раз.",
  link: "Ссылка из письма устарела или уже использована. Войдите или запросите новое письмо.",
  default: "Неверная почта или пароль.",
};

const LOGIN_ERRORS_EN: Record<string, string> = {
  rate: "Too many attempts — please wait a moment.",
  blocked: "This account has been suspended. Please contact support.",
  google_only: "This email uses Google sign-in — use the button above.",
  google_off: "Google sign-in isn’t set up yet.",
  google_cancel: "Google sign-in was canceled.",
  google_state: "This sign-in link has expired — please start again.",
  google_fail: "Google didn’t confirm the sign-in. Please try again.",
  link: "This email link has expired or has already been used. Sign in or request a new one.",
  default: "Incorrect email or password.",
};

const TEXT = {
  ru: {
    home: "/", title: "Вход", subtitle: "Панель организатора", google: "Войти через Google",
    googleNote: ["Входя через Google впервые, вы принимаете ", "оферту", " и даёте ", "согласие на обработку персональных данных", "."],
    email: "Почта", password: "Пароль", submit: "Войти", forgot: "Забыли пароль?", noAccount: "Ещё нет кабинета?", create: "Создать", register: "/register",
  },
  en: {
    home: "/en", title: "Sign in", subtitle: "Your wedding planning dashboard", google: "Sign in with Google",
    googleNote: ["By signing in with Google for the first time, you accept the ", "Terms of Service", " and ", "consent to the processing of your personal data", " (both in Russian)."],
    email: "Email", password: "Password", submit: "Sign in", forgot: "Forgot your password?", noAccount: "Don’t have an account yet?", create: "Create one", register: "/register?lang=en",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; lang?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");
  const { error, lang: langParam } = await searchParams;
  const lang = await pageLang(langParam);
  const t = TEXT[lang];
  const errors = lang === "en" ? LOGIN_ERRORS_EN : LOGIN_ERRORS;

  return (
    <main lang={lang} className="relative mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-24">
      <div className="absolute top-4 right-5 text-stone-600 sm:right-6"><LangSwitch current={lang} stay /></div>
      <p className="text-center">
        <Link href={t.home} className="font-serif text-2xl tracking-wide"><BrandLogo size={64} /></Link>
      </p>
      <h1 className="mt-8 text-center text-3xl">{t.title}</h1>
      <p className="mt-2 text-center text-sm text-stone-600">{t.subtitle}</p>
      <div className="mx-auto my-7 h-px w-12 bg-stone-200" />

      {googleEnabled() && (
        <>
          <GoogleButton label={t.google} />
          <p className="mt-3 text-center text-xs leading-relaxed text-stone-500">
            {t.googleNote[0]}<Link href="/offer" className="underline">{t.googleNote[1]}</Link>{t.googleNote[2]}
            <Link href="/consent" className="underline">{t.googleNote[3]}</Link>{t.googleNote[4]}
          </p>
          <OrRule />
        </>
      )}

      <form action={login} className="mt-8 space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label className="block text-sm text-stone-600" htmlFor="email">{t.email}</label>
          <input
            id="email" name="email" type="email" required autoComplete="username"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="password">{t.password}</label>
          <input
            id="password" name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-700">{errors[error] ?? errors.default}</p>}

        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">
          {t.submit}
        </button>
        {emailConfigured() && <p className="text-center text-sm"><Link href="/forgot" className="text-stone-600 underline">{t.forgot}</Link></p>}
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        {t.noAccount} <Link href={t.register} className="underline">{t.create}</Link>
      </p>
    </main>
  );
}
