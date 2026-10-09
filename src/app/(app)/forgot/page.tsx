import { BrandLogo } from "@/components/brand";
/**
 * «Забыли пароль?» — письмо со ссылкой на новый пароль. Ответ одинаковый,
 * есть кабинет или нет: форма не должна выдавать, чьи адреса у нас есть.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { rateLimit } from "@/server/rate-limit";
import { requestOrigin } from "@/server/auth/session";
import { normalizeEmail, requestPasswordReset } from "@/server/services/email-auth";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LangSwitch } from "@/components/lang-switch";
import { LANG_COOKIE, makeT, parseLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Язык страницы: ?lang= (ссылки с английского входа), затем выбор посетителя в cookie. */
async function pageLang(lang?: string): Promise<Lang> {
  return parseLang(lang) ?? parseLang((await cookies()).get(LANG_COOKIE)?.value) ?? "ru";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = await pageLang((await searchParams).lang);
  return lang === "en" ? { title: { absolute: "New password — Vmeste" } } : {};
}

async function forgot(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  // Английская версия страницы сохраняет язык и в адресах после отправки.
  const lang: Lang = formData.get("lang") === "en" ? "en" : "ru";
  const q = lang === "en" ? "&lang=en" : "";
  const { ip } = await requestOrigin();
  if (!rateLimit(`forgot:${email}`, 3, 15 * 60_000).ok || !rateLimit(`forgot-ip:${ip ?? "?"}`, 20, 3_600_000).ok) {
    redirect(`/forgot?sent=rate${q}`);
  }
  await requestPasswordReset(email, lang);
  redirect(`/forgot?sent=1&email=${encodeURIComponent(email)}${q}`);
}

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string; email?: string; lang?: string }> }) {
  const { sent, email, lang: langParam } = await searchParams;
  const lang = await pageLang(langParam);
  const t = makeT(lang);
  return (
    <main lang={lang} className="relative mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <div className="absolute top-4 right-5 text-stone-600 sm:right-6"><LangSwitch current={lang} stay /></div>
      <p className="text-center"><Link href={lang === "en" ? "/en" : "/"} className="font-serif text-2xl tracking-wide"><BrandLogo size={64} lang={lang} /></Link></p>
      <h1 className="mt-8 text-center text-3xl">{t("Новый пароль", "New password")}</h1>
      {sent === "1" ? (
        <p className="mt-6 text-center text-sm leading-relaxed text-stone-600">
          {lang === "en" ? (
            <>If there’s an account for <b className="text-stone-900">{email}</b>, an email with a link is on its way. The link works for 1 hour. No email? Check your spam folder.</>
          ) : (
            <>Если кабинет на <b className="text-stone-900">{email}</b> есть, письмо со ссылкой уже в пути. Ссылка работает 1 час.
          Нет письма — проверьте «Спам».</>
          )}
        </p>
      ) : (
        <>
          <p className="mt-2 text-center text-sm text-stone-600">{t("Пришлём ссылку, по которой можно придумать новый пароль", "We’ll send you a link to set a new password")}</p>
          <form action={forgot} className="mt-8 space-y-4">
            <input type="hidden" name="lang" value={lang} />
            <div>
              <label className="block text-sm text-stone-600" htmlFor="email">{t("Почта кабинета", "Account email")}</label>
              <input id="email" name="email" type="email" required maxLength={200} autoComplete="email"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2" />
            </div>
            {sent === "rate" && <p className="text-sm text-red-700">{t("Писем уже несколько — подождите 15 минут.", "We’ve already sent several emails — please wait 15 minutes.")}</p>}
            <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">{t("Прислать ссылку", "Send link")}</button>
          </form>
        </>
      )}
      <p className="mt-8 text-center text-sm text-stone-600"><Link href={lang === "en" ? "/login?lang=en" : "/login"} className="underline">{t("Вернуться ко входу", "Back to sign in")}</Link></p>
    </main>
  );
}
