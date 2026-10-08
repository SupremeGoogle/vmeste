"use client";

/**
 * Уведомление о cookie. Рекламных cookie на сайте нет, только нужные для
 * входа (см. /cookies), поэтому выбора «принять / отклонить» нет —
 * только сообщение и «Понятно». Закрытие запоминается в localStorage.
 *
 * На сервере уведомление не рисуется: там неизвестно, закрывал ли его
 * посетитель, а мигание при гидратации хуже, чем появление чуть позже.
 */
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const KEY = "vm_cookie_ok";

const noSubscribe = () => () => {};

function dismissed() {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    // Хранилище закрыто (приватный режим) — не надоедаем на каждой странице.
    return true;
  }
}

export function CookieNotice() {
  const stored = useSyncExternalStore(noSubscribe, dismissed, () => true);
  const [closed, setClosed] = useState(false);

  if (stored || closed) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setClosed(true);
  };

  return (
    <div
      role="region"
      aria-label="Уведомление о cookie"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-stone-200 bg-card p-4 text-sm text-stone-700 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4"
    >
      <p className="flex-1 leading-relaxed">
        Мы используем cookie, чтобы вы могли войти в кабинет и открыть приглашение. Подробнее — в{" "}
        <Link href="/cookies" className="underline underline-offset-4">политике cookie</Link>.
      </p>
      <button
        type="button"
        onClick={close}
        className="shrink-0 rounded-full bg-stone-900 px-5 py-2 text-white transition-opacity hover:opacity-90"
      >
        Понятно
      </button>
    </div>
  );
}
