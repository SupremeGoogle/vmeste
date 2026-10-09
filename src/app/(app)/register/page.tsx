import { BrandLogo } from "@/components/brand";
/**
 * Создание кабинета: через Google или по почте с паролем.
 *
 * Google по-прежнему первым: не нужно придумывать пароль, почта уже
 * подтверждена, восстановление доступа — забота Google. Но не у всех
 * есть Google-аккаунт (Яндекс, Mail.ru), поэтому есть и форма: кабинет
 * заводится сразу, а открывается только после кода из письма
 * (services/email-auth.ts). Без подтверждения войти нельзя — иначе любой
 * занял бы чужой адрес.
 */
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/server/auth/google";
import { rateLimit } from "@/server/rate-limit";
import { getSessionUser, requestOrigin } from "@/server/auth/session";
import { AUTH_MESSAGES, PASSWORD_MIN, normalizeEmail, registerWithEmail, type AuthCode } from "@/server/services/email-auth";
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
    ? { title: { absolute: "Create an account — Vmeste" }, description: "Create an account and start planning your wedding: invitations, guest list, RSVPs and seating charts in one place.", alternates: { canonical: "/register" } }
    : { title: "Регистрация", description: "Создайте кабинет и начните готовить свадьбу: приглашения, список гостей, ответы и рассадка в одном месте.", alternates: { canonical: "/register" } };
}

const GOOGLE_ERRORS: Record<string, string> = {
  google_off: "Вход через Google пока не настроен.",
  google_cancel: "Вход через Google отменён — попробуйте ещё раз.",
  google_state: "Ссылка входа устарела, начните заново.",
  google_fail: "Google не подтвердил вход. Попробуйте ещё раз.",
  blocked: "Доступ к кабинету закрыт. Напишите в поддержку.",
  consent: "Отметьте согласие с условиями — без него кабинет не создать.",
};

/** AUTH_MESSAGES и ошибки Google — по-английски, по тем же кодам. */
const ERRORS_EN: Record<string, string> = {
  email: "Please check your email address.",
  password_short: `Your password must be at least ${PASSWORD_MIN} characters.`,
  password_long: "That password is too long.",
  password_weak: "This password is too common — it’s one of the first attackers try.",
  password_mismatch: "The passwords don’t match.",
  link: "This link has expired or was already used — please request a new one.",
  rate: "Too many attempts — please wait a few minutes.",
  code_wrong: "That code is incorrect — double-check the digits in the email.",
  code_expired: "The code has expired — we’ll send you a new one.",
  code_attempts: "Too many wrong attempts — please request a new code.",
  google_off: "Google sign-in isn’t set up yet.",
  google_cancel: "Google sign-in was canceled — please try again.",
  google_state: "This sign-in link has expired — please start again.",
  google_fail: "Google didn’t confirm the sign-in. Please try again.",
  blocked: "This account has been suspended. Please contact support.",
  consent: "Please check the consent box — we can’t create an account without it.",
};

const TEXT = {
  ru: {
    home: "/", title: "Создать кабинет", subtitle: "Приглашения, гости и рассадка — в одном месте", google: "Продолжить с Google",
    googleNote: ["Продолжая с Google, вы принимаете ", "оферту", " и даёте ", "согласие на обработку персональных данных", "."],
    unavailable: "Регистрация временно недоступна. Напишите нам — заведём кабинет руками.",
    email: "Почта", password: "Пароль", min: `Не короче ${PASSWORD_MIN} символов`,
    consent: ["Принимаю условия ", "оферты", " и даю ", "согласие на обработку персональных данных", " в соответствии с ", "Политикой конфиденциальности", ""],
    submit: "Создать кабинет", code: "Пришлём на почту код из 6 цифр — введите его, и кабинет откроется.", fallback: "Не получилось, попробуйте ещё раз.",
    hasAccount: "Уже есть кабинет?", login: "Войти", loginHref: "/login",
  },
  en: {
    home: "/en", title: "Create your account", subtitle: "Invitations, guests and seating — all in one place", google: "Continue with Google",
    googleNote: ["By continuing with Google, you accept the ", "Terms of Service", " and ", "consent to the processing of your personal data", " (both in Russian)."],
    unavailable: "Sign-up is temporarily unavailable. Contact us and we’ll set up your account manually.",
    email: "Email", password: "Password", min: `At least ${PASSWORD_MIN} characters`,
    consent: ["I accept the ", "Terms of Service", " and ", "consent to the processing of my personal data", " under the ", "Privacy Policy", " (documents in Russian)"],
    submit: "Create account", code: "We’ll email you a 6-digit code — enter it to open your account.", fallback: "Something went wrong — please try again.",
    hasAccount: "Already have an account?", login: "Sign in", loginHref: "/login?lang=en",
  },
};

async function register(formData: FormData) {
  "use server";
  // Письма не настроены — кабинет без кода подтверждения не открыть.
  if (!emailConfigured()) redirect(formData.get("lang") === "en" ? "/register?lang=en" : "/register");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  // Английская версия страницы сохраняет язык и в адресах с ошибкой.
  const q = formData.get("lang") === "en" ? "&lang=en" : "";
  // Согласие по 152-ФЗ — активное действие; браузерный `required` можно обойти.
  if (formData.get("consent") !== "on") redirect(`/register?error=consent&email=${encodeURIComponent(email)}${q}`);
  const { ip } = await requestOrigin();
  // Против рассылки писем по чужим адресам: 5 регистраций в час на адрес
  // почты и 20 — с одного IP (площадка с общим Wi-Fi остаётся в запасе).
  if (!rateLimit(`register:${email}`, 5, 3_600_000).ok || !rateLimit(`register-ip:${ip ?? "?"}`, 20, 3_600_000).ok) {
    redirect(`/register?error=rate${q}`);
  }
  const result = await registerWithEmail({
    email,
    password: String(formData.get("password") ?? ""),
    lang: formData.get("lang") === "en" ? "en" : "ru",
  });
  if (!result.ok) redirect(`/register?error=${result.code}&email=${encodeURIComponent(email)}${q}`);
  redirect(`/register/check?email=${encodeURIComponent(email)}${q}`);
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; lang?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");
  const { error, email, lang: langParam } = await searchParams;
  const lang = await pageLang(langParam);
  const t = TEXT[lang];
  const enabled = googleEnabled();
  const emailOn = emailConfigured();
  const message = !error ? null : lang === "en" ? (ERRORS_EN[error] ?? t.fallback) : (AUTH_MESSAGES[error as AuthCode] ?? GOOGLE_ERRORS[error] ?? t.fallback);

  return (
    <main lang={lang} className="relative mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <div className="absolute top-4 right-5 text-stone-600 sm:right-6"><LangSwitch current={lang} stay /></div>
      <p className="text-center">
        <Link href={t.home} className="font-serif text-2xl tracking-wide"><BrandLogo size={64} /></Link>
      </p>
      <h1 className="mt-8 text-center text-3xl">{t.title}</h1>
      <p className="mt-2 text-center text-sm text-stone-600">
        {t.subtitle}
      </p>
      <div className="mx-auto my-7 h-px w-12 bg-stone-200" />

      {enabled && (
        <>
          <GoogleButton label={t.google} />
          <p className="mt-3 text-center text-xs leading-relaxed text-stone-500">
            {t.googleNote[0]}<Link href="/offer" className="underline">{t.googleNote[1]}</Link>{t.googleNote[2]}
            <Link href="/consent" className="underline">{t.googleNote[3]}</Link>{t.googleNote[4]}
          </p>
          {emailOn && <OrRule label={lang === "en" ? "or" : "или"} />}
        </>
      )}

      {!enabled && !emailOn && (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t.unavailable}
        </p>
      )}

      {emailOn && <form action={register} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label className="block text-sm text-stone-600" htmlFor="email">{t.email}</label>
          <input
            id="email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={email ?? ""}
            className="ym-hide-content mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="password">{t.password}</label>
          <input
            id="password" name="password" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password"
            className="ym-hide-content mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2"
          />
          <p className="mt-1 text-xs text-stone-500">{t.min}</p>
        </div>

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-stone-600">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-stone-900" />
          <span>
            {t.consent[0]}<Link href="/offer" className="underline">{t.consent[1]}</Link>{t.consent[2]}
            <Link href="/consent" className="underline">{t.consent[3]}</Link>{t.consent[4]}
            <Link href="/privacy" className="underline">{t.consent[5]}</Link>{t.consent[6]}
          </span>
        </label>

        {message && <p className="text-sm text-red-700">{message}</p>}

        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white" data-rybbit-event="email_register">
          {t.submit}
        </button>
        <p className="text-center text-xs leading-relaxed text-stone-500">
          {t.code}
        </p>
      </form>}
      {!emailOn && message && <p className="mt-5 text-center text-sm text-red-700">{message}</p>}

      <p className="mt-8 text-center text-sm text-stone-600">
        {t.hasAccount} <Link href={t.loginHref} className="underline">{t.login}</Link>
      </p>
    </main>
  );
}
