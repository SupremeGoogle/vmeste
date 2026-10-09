import { BrandLogo } from "@/components/brand";
/**
 * Ввод кода из письма после регистрации — и повторная отправка кода.
 *
 * Что именно ушло на адрес (код или «кабинет уже есть»), здесь не
 * говорится: страница не должна выдавать, зарегистрирован ли адрес.
 * Подбор кода закрыт дважды: 5 попыток на код (services/email-auth.ts) и
 * лимит попыток на адрес почты и на IP здесь.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { rateLimit } from "@/server/rate-limit";
import { createSession, requestOrigin } from "@/server/auth/session";
import { authMessage, confirmEmailCode, normalizeEmail, resendVerification } from "@/server/services/email-auth";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LangSwitch } from "@/components/lang-switch";
import { LANG_COOKIE, makeT, parseLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Язык страницы: ?lang= (переход с английской регистрации или входа), затем выбор посетителя в cookie. */
async function pageLang(lang?: string): Promise<Lang> {
  return parseLang(lang) ?? parseLang((await cookies()).get(LANG_COOKIE)?.value) ?? "ru";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = await pageLang((await searchParams).lang);
  return lang === "en" ? { title: { absolute: "Email code — Vmeste" } } : {};
}

/** Английская версия страницы сохраняет язык и в адресах после действий. */
const page = (email: string, query: string, lang?: FormDataEntryValue | null) =>
  `/register/check?email=${encodeURIComponent(email)}&${query}${lang === "en" ? "&lang=en" : ""}`;

async function confirm(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const lang = formData.get("lang");
  const { ip } = await requestOrigin();
  if (!rateLimit(`code:${email}`, 10, 10 * 60_000).ok || !rateLimit(`code-ip:${ip ?? "?"}`, 40, 10 * 60_000).ok) {
    redirect(page(email, "error=rate", lang));
  }
  const result = await confirmEmailCode(email, String(formData.get("code") ?? ""));
  if (!result.ok) redirect(page(email, `error=${result.code}${result.left ? `&left=${result.left}` : ""}`, lang));
  await createSession(result.userId);
  redirect("/app");
}

async function resend(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const lang = formData.get("lang");
  // Не чаще трёх писем в 15 минут на адрес — иначе формой можно заваливать чужой ящик.
  if (!rateLimit(`resend:${email}`, 3, 15 * 60_000).ok) redirect(page(email, "sent=rate", lang));
  await resendVerification(email, lang === "en" ? "en" : "ru");
  redirect(page(email, "sent=1", lang));
}

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string; unverified?: string; error?: string; left?: string; lang?: string }>;
}) {
  const { email = "", sent, unverified, error, left, lang: langParam } = await searchParams;
  const lang = await pageLang(langParam);
  const t = makeT(lang);
  const message = error ? authMessage(error, lang) : null;
  const tries = Number(left);

  return (
    <main lang={lang} className="relative mx-auto max-w-sm px-5 py-16 text-center sm:px-6 sm:py-20">
      <div className="absolute top-4 right-5 text-stone-600 sm:right-6"><LangSwitch current={lang} stay /></div>
      <p><Link href={lang === "en" ? "/en" : "/"} className="font-serif text-2xl tracking-wide"><BrandLogo size={64} lang={lang} /></Link></p>
      <h1 className="mt-8 text-3xl">{t("Код из письма", "Check your email")}</h1>
      {unverified && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("Почта ещё не подтверждена — введите код из письма.", "Your email isn’t verified yet — enter the code from the email.")}</p>}
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        {lang === "en"
          ? <>We sent a 6-digit code{email ? <> to <b className="text-stone-900">{email}</b></> : null}. It’s valid for 15 minutes.</>
          : <>Мы отправили 6 цифр{email ? <> на <b className="text-stone-900">{email}</b></> : null}. Код действует 15 минут.</>}
      </p>

      <form action={confirm} className="mt-8 space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="lang" value={lang} />
        <label className="sr-only" htmlFor="code">{t("Код из письма", "Code from the email")}</label>
        <input
          id="code" name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}" maxLength={7} placeholder="000 000"
          className="w-full rounded-xl border border-stone-300 bg-card px-4 py-3 text-center font-mono text-3xl tracking-[0.3em]"
        />
        {message && (
          <p className="text-sm text-red-700">
            {message}{error === "code_wrong" && tries > 0 ? t(` Осталось попыток: ${tries}.`, ` Attempts left: ${tries}.`) : ""}
          </p>
        )}
        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white" data-rybbit-event="email_code">
          {t("Подтвердить", "Verify")}
        </button>
      </form>

      <p className="mt-6 text-xs text-stone-500">{t("Письмо идёт до минуты. Нет во «Входящих» — загляните в «Спам» и «Промоакции».", "The email can take up to a minute. Not in your inbox? Check Spam and Promotions.")}</p>
      <form action={resend} className="mt-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="lang" value={lang} />
        <button className="rounded-lg border border-stone-300 bg-card px-4 py-2 text-sm">{t("Прислать новый код", "Send a new code")}</button>
      </form>
      {sent === "1" && <p className="mt-3 text-sm text-emerald-700">{t("Отправили новый код — прежний больше не действует.", "We sent a new code — the previous one no longer works.")}</p>}
      {sent === "rate" && <p className="mt-3 text-sm text-red-700">{t("Писем уже несколько — подождите 15 минут.", "We’ve already sent several emails — please wait 15 minutes.")}</p>}

      <p className="mt-10 text-sm text-stone-600">
        {t("Ошиблись адресом?", "Wrong email?")} <Link href={lang === "en" ? "/register?lang=en" : "/register"} className="underline">{t("Зарегистрироваться заново", "Sign up again")}</Link>
        <br />{t("Уже подтвердили?", "Already verified?")} <Link href={lang === "en" ? "/login?lang=en" : "/login"} className="underline">{t("Войти", "Sign in")}</Link>
      </p>
    </main>
  );
}
