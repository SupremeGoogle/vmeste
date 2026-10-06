import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { leaveAdmin, requireAdmin } from "@/server/admin/access";
import { AdminNav } from "./nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Вместе — управление платформой" };

const ROLE_LABEL = { OWNER: "Владелец", ADMIN: "Администратор", SUPPORT: "Поддержка" } as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  async function leave() {
    "use server";
    const current = await requireAdmin();
    await leaveAdmin(current);
    redirect("/app");
  }

  const until = admin.elevatedUntil?.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-stone-200 bg-[#1f1b18] text-stone-200 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <div>
            <p className="font-serif text-xl text-white">Вместе</p>
            <p className="text-[11px] tracking-[0.16em] text-stone-400 uppercase">Управление</p>
          </div>
          <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-[11px] text-amber-200 lg:mt-3 lg:inline-block">{ROLE_LABEL[admin.role]}</span>
        </div>
        <AdminNav role={admin.role} />
        <div className="hidden px-5 py-4 text-xs text-stone-400 lg:block">
          <p className="truncate" title={admin.email}>{admin.email}</p>
          {until && <p className="mt-1">Панель открыта до {until} МСК</p>}
          <form action={leave} className="mt-3">
            <button type="submit" className="rounded-lg border border-white/15 px-3 py-1.5 text-stone-200 hover:bg-white/10">Закрыть панель</button>
          </form>
          <Link href="/app" className="mt-2 inline-block underline underline-offset-2 hover:text-white">В кабинет организатора</Link>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
