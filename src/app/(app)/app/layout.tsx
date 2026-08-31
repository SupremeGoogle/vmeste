import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { destroySession } from "@/server/auth/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  return (
    <div>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/app" className="font-serif text-lg tracking-wide">Вместе</Link>
          <div className="flex items-center gap-4 text-sm text-stone-600">
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
