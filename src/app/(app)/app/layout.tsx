import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { destroySession } from "@/server/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand";
import { getAdminIdentity } from "@/server/admin/access";
import { endImpersonation } from "@/server/admin/operations";
import { getUiLang } from "@/server/i18n";
import { makeT } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n-provider";
import { LangSwitch } from "@/components/lang-switch";

/** Заголовок вкладки кабинета — на языке организатора. */
export async function generateMetadata(): Promise<Metadata> {
  const t = makeT(await getUiLang());
  return { title: { default: t("Вместе — панель организатора", "Vmeste — wedding dashboard"), template: t("%s — Вместе", "%s — Vmeste") } };
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Без сессии — не форма входа, а кабинет без регистрации (app/start).
  if (!user) redirect("/app/start");

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  // Администратор смотрит кабинет глазами пользователя («войти как»).
  async function stopImpersonating() {
    "use server";
    const back = await endImpersonation();
    redirect(back ? "/admin/users" : "/login");
  }

  const admin = user.impersonatedBy ? null : await getAdminIdentity();
  const lang = await getUiLang();
  const t = makeT(lang);

  return (
    <I18nProvider lang={lang}>
    <div lang={lang}>
      {user.impersonatedBy && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm text-stone-900">
          <span>{t("Вы в кабинете", "You are in the account of")} <b>{user.email}</b> {t("как администратор", "as an administrator")} ({user.impersonatedBy.email}). {t("Всё, что вы меняете, меняется у пользователя.", "Everything you change is changed for this user.")}</span>
          <form action={stopImpersonating}><button className="rounded-lg bg-stone-900 px-3 py-1 text-xs text-white">{t("Вернуться в панель", "Back to admin panel")}</button></form>
        </div>
      )}
      <header className="border-b border-stone-200 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/app" className="font-serif text-lg tracking-wide"><BrandLogo size={36} /></Link>
          <div className="flex items-center gap-4 text-sm text-stone-600">
            <LangSwitch current={lang} stay />
            <ThemeToggle />
            {admin && <Link href={admin.elevated ? "/admin" : "/admin/verify"} className="rounded-md bg-stone-900 px-2 py-1 text-xs text-white">{t("Управление", "Admin")}</Link>}
            {user.isAnonymous ? (
              <>
                {/* Выйти из кабинета без регистрации — значит потерять его:
                    вместо «Выйти» — вход и регистрация, черновик переедет. */}
                <Link href={lang === "en" ? "/login?lang=en" : "/login"} className="hover:text-stone-900">{t("Войти", "Sign in")}</Link>
                <Link href={lang === "en" ? "/register?lang=en" : "/register"} className="rounded-md bg-stone-900 px-2.5 py-1 text-xs text-white">{t("Сохранить кабинет", "Save my account")}</Link>
              </>
            ) : (
              <>
                {/* Имя на телефоне режем: «Организатор Анастасия Петровна»
                    вытеснила бы кнопку выхода за край экрана. */}
                <Link href="/app/settings" className="max-w-[42vw] truncate hover:text-stone-900 sm:max-w-none">
                  {user.name}
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-stone-500 hover:text-stone-900">{t("Выйти", "Sign out")}</button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>
      {user.isAnonymous && (
        <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 sm:text-sm">
          {t("Вы работаете без регистрации — всё сохраняется в этом браузере. ", "You’re working without an account — everything is saved in this browser. ")}
          <Link href={lang === "en" ? "/register?lang=en" : "/register"} className="underline underline-offset-2">{t("Зарегистрируйтесь", "Sign up")}</Link>
          {t(", чтобы не потерять доступ; почта понадобится и для публикации.", " so you don’t lose access; you’ll also need it to publish.")}
        </p>
      )}
      {children}
    </div>
    </I18nProvider>
  );
}
