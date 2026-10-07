"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Сводка", exact: true },
  { href: "/admin/analytics", label: "Аналитика" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/events", label: "Мероприятия" },
  { href: "/admin/audit", label: "Журнал" },
  { href: "/admin/security", label: "Безопасность" },
];

export function AdminNav({ role }: { role: "OWNER" | "ADMIN" | "SUPPORT" }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0" aria-label="Разделы панели">
      {ITEMS.map((item) => {
        const active = item.exact ? path === item.href : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white/10 text-white" : "text-stone-300 hover:bg-white/5 hover:text-white"}`}
          >
            {item.label}
          </Link>
        );
      })}
      {role === "SUPPORT" && <p className="hidden px-3 pt-3 text-[11px] text-stone-500 lg:block">Режим просмотра: действия недоступны</p>}
    </nav>
  );
}
