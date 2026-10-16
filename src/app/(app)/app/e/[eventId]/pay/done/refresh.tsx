"use client";
/**
 * Ждём уведомления Robokassa: страница сама перепроверяет счёт каждые
 * 3 секунды, пока он не оплачен, — но не дольше двух минут.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshWhilePending({ startedAt }: { startedAt: number }) {
  const router = useRouter();
  useEffect(() => {
    if (Date.now() - startedAt > 120_000) return;
    const timer = window.setTimeout(() => router.refresh(), 3000);
    return () => window.clearTimeout(timer);
  });
  return null;
}
