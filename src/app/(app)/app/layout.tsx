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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/app" className="font-semibold">Вместе</Link>
          <div className="flex items-center gap-4 text-sm text-stone-600">
            <Link href="/app/settings" className="hover:text-stone-900">{user.name}</Link>
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
