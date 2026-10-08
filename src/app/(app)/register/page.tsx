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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Создайте кабинет и начните готовить свадьбу: приглашения, список гостей, ответы и рассадка в одном месте.",
  alternates: { canonical: "/register" },
};

const GOOGLE_ERRORS: Record<string, string> = {
  google_off: "Вход через Google пока не настроен.",
  google_cancel: "Вход через Google отменён — попробуйте ещё раз.",
  google_state: "Ссылка входа устарела, начните заново.",
  google_fail: "Google не подтвердил вход. Попробуйте ещё раз.",
  blocked: "Доступ к кабинету закрыт. Напишите в поддержку.",
  consent: "Отметьте согласие с условиями — без него кабинет не создать.",
};

async function register(formData: FormData) {
  "use server";
  // Письма не настроены — кабинет без кода подтверждения не открыть.
  if (!emailConfigured()) redirect("/register");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  // Согласие по 152-ФЗ — активное действие; браузерный `required` можно обойти.
  if (formData.get("consent") !== "on") redirect(`/register?error=consent&email=${encodeURIComponent(email)}`);
  const { ip } = await requestOrigin();
  // Против рассылки писем по чужим адресам: 5 регистраций в час на адрес
  // почты и 20 — с одного IP (площадка с общим Wi-Fi остаётся в запасе).
  if (!rateLimit(`register:${email}`, 5, 3_600_000).ok || !rateLimit(`register-ip:${ip ?? "?"}`, 20, 3_600_000).ok) {
    redirect("/register?error=rate");
  }
  const result = await registerWithEmail({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) redirect(`/register?error=${result.code}&email=${encodeURIComponent(email)}`);
  redirect(`/register/check?email=${encodeURIComponent(email)}`);
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");
  const { error, email } = await searchParams;
  const enabled = googleEnabled();
  const emailOn = emailConfigured();
  const message = error ? (AUTH_MESSAGES[error as AuthCode] ?? GOOGLE_ERRORS[error] ?? "Не получилось, попробуйте ещё раз.") : null;

  return (
    <main className="mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <p className="text-center">
        <Link href="/" className="font-serif text-2xl tracking-wide"><BrandLogo size={64} /></Link>
      </p>
      <h1 className="mt-8 text-center text-3xl">Создать кабинет</h1>
      <p className="mt-2 text-center text-sm text-stone-600">
        Приглашения, гости и рассадка — в одном месте
      </p>
      <div className="mx-auto my-7 h-px w-12 bg-stone-200" />

      {enabled && (
        <>
          <GoogleButton label="Продолжить с Google" />
          <p className="mt-3 text-center text-xs leading-relaxed text-stone-500">
            Продолжая с Google, вы принимаете <Link href="/offer" className="underline">оферту</Link> и даёте{" "}
            <Link href="/consent" className="underline">согласие на обработку персональных данных</Link>.
          </p>
          {emailOn && <OrRule />}
        </>
      )}

      {!enabled && !emailOn && (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Регистрация временно недоступна. Напишите нам — заведём кабинет руками.
        </p>
      )}

      {emailOn && <form action={register} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-600" htmlFor="email">Почта</label>
          <input
            id="email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={email ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="password">Пароль</label>
          <input
            id="password" name="password" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2"
          />
          <p className="mt-1 text-xs text-stone-500">Не короче {PASSWORD_MIN} символов</p>
        </div>

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-stone-600">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-stone-900" />
          <span>
            Принимаю условия <Link href="/offer" className="underline">оферты</Link> и даю{" "}
            <Link href="/consent" className="underline">согласие на обработку персональных данных</Link> в соответствии
            с <Link href="/privacy" className="underline">Политикой конфиденциальности</Link>
          </span>
        </label>

        {message && <p className="text-sm text-red-700">{message}</p>}

        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white" data-rybbit-event="email_register">
          Создать кабинет
        </button>
        <p className="text-center text-xs leading-relaxed text-stone-500">
          Пришлём на почту код из 6 цифр — введите его, и кабинет откроется.
        </p>
      </form>}
      {!emailOn && message && <p className="mt-5 text-center text-sm text-red-700">{message}</p>}

      <p className="mt-8 text-center text-sm text-stone-600">
        Уже есть кабинет? <Link href="/login" className="underline">Войти</Link>
      </p>
    </main>
  );
}
