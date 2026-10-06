import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { destroySession } from "@/server/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand";
import { getAdminIdentity } from "@/server/admin/access";
import { endImpersonation } from "@/server/admin/operations";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

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

  return (
    <div>
      {user.impersonatedBy && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm text-stone-900">
          <span>Вы в кабинете <b>{user.email}</b> как администратор ({user.impersonatedBy.email}). Всё, что вы меняете, меняется у пользователя.</span>
          <form action={stopImpersonating}><button className="rounded-lg bg-stone-900 px-3 py-1 text-xs text-white">Вернуться в панель</button></form>
        </div>
      )}
      <header className="border-b border-stone-200 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/app" className="font-serif text-lg tracking-wide"><BrandLogo size={36} /></Link>
          <div className="flex items-center gap-4 text-sm text-stone-600">
            <ThemeToggle />
            {admin && <Link href={admin.elevated ? "/admin" : "/admin/verify"} className="rounded-md bg-stone-900 px-2 py-1 text-xs text-white">Управление</Link>}
            {/* Имя на телефоне режем: «Организатор Анастасия Петровна»
                вытеснила бы кнопку выхода за край экрана. */}
            <Link href="/app/settings" className="max-w-[42vw] truncate hover:text-stone-900 sm:max-w-none">
              {user.name}
            </Link>
            <form action={logout}>
              <button type="submit" className="text-stone-500 hover:text-stone-900">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
