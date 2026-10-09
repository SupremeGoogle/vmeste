import { BrandLogo } from "@/components/brand";
/**
 * Новый пароль по ссылке из письма. Ссылка одноразовая; после смены все
 * прежние сессии гаснут, а человек сразу входит в кабинет.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSession } from "@/server/auth/session";
import { PASSWORD_MIN, authMessage, resetPasswordWithToken, type AuthCode } from "@/server/services/email-auth";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LangSwitch } from "@/components/lang-switch";
import { LANG_COOKIE, makeT, parseLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Язык страницы: ?lang= (ссылка из английского письма), затем выбор посетителя в cookie. */
async function pageLang(lang?: string): Promise<Lang> {
  return parseLang(lang) ?? parseLang((await cookies()).get(LANG_COOKIE)?.value) ?? "ru";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = await pageLang((await searchParams).lang);
  return lang === "en" ? { title: { absolute: "New password — Vmeste" } } : {};
}

async function reset(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const q = formData.get("lang") === "en" ? "&lang=en" : "";
  const back = (code: AuthCode) => redirect(`/reset?token=${encodeURIComponent(token)}&error=${code}${q}`);
  if (password !== String(formData.get("confirm") ?? "")) back("password_mismatch");
  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) back(result.code);
  else {
    await createSession(result.userId);
    redirect("/app");
  }
}

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string; lang?: string }> }) {
  const { token = "", error, lang: langParam } = await searchParams;
  const lang = await pageLang(langParam);
  const t = makeT(lang);
  const message = error ? authMessage(error, lang) ?? t("Не получилось, попробуйте ещё раз.", "Something went wrong — please try again.") : null;
  return (
    <main lang={lang} className="relative mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <div className="absolute top-4 right-5 text-stone-600 sm:right-6"><LangSwitch current={lang} stay /></div>
      <p className="text-center"><Link href={lang === "en" ? "/en" : "/"} className="font-serif text-2xl tracking-wide"><BrandLogo size={64} lang={lang} /></Link></p>
      <h1 className="mt-8 text-center text-3xl">{t("Новый пароль", "New password")}</h1>
      <form action={reset} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label className="block text-sm text-stone-600" htmlFor="password">{t("Новый пароль", "New password")}</label>
          <input id="password" name="password" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2" />
          <p className="mt-1 text-xs text-stone-500">{t(`Не короче ${PASSWORD_MIN} символов`, `At least ${PASSWORD_MIN} characters`)}</p>
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="confirm">{t("Ещё раз", "Confirm password")}</label>
          <input id="confirm" name="confirm" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2" />
        </div>
        {message && (
          <p className="text-sm text-red-700">
            {message}{error === "link" && <> <Link href={lang === "en" ? "/forgot?lang=en" : "/forgot"} className="underline">{t("Запросить новую ссылку", "Request a new link")}</Link></>}
          </p>
        )}
        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">{t("Сохранить и войти", "Save and sign in")}</button>
      </form>
    </main>
  );
}
