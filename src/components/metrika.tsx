"use client";

/**
 * Яндекс Метрика — только на открытых страницах (лендинг, документы,
 * вход и регистрация). В кабинет, на сброс пароля и на экран «введите
 * код» счётчик не ходит: там чужие данные и адреса почты в ссылках.
 *
 * Вебвизор выключен намеренно: запись экрана на форме входа поймала бы
 * адрес почты. Адрес отправляется без query-строки — по той же причине
 * (`/register?error=…&email=…`).
 *
 * Хиты шлём сами на каждую смену адреса (`defer: true`): переходы внутри
 * Next проходят без перезагрузки, и сам счётчик их не видит.
 */
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { METRIKA_ID } from "@/lib/site";

const PRIVATE = /^\/(app|admin|forgot|reset|register\/check)(\/|$)/;

type Ym = ((...args: unknown[]) => void) & { a?: IArguments[]; l?: number };

let started = false;
let previous: string | undefined;

export function Metrika() {
  const pathname = usePathname() ?? "/";
  const allowed = !PRIVATE.test(pathname);

  useEffect(() => {
    if (!allowed) return;
    const w = window as unknown as { ym?: Ym };
    if (!w.ym) {
      // Очередь вызовов до загрузки tag.js — как в официальном коде счётчика.
      const queue: Ym = function () {
        // eslint-disable-next-line prefer-rest-params
        (queue.a = queue.a || []).push(arguments);
      };
      queue.l = Date.now();
      w.ym = queue;
    }
    if (!started) {
      w.ym(METRIKA_ID, "init", { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
      started = true;
    }
    const url = window.location.origin + pathname;
    w.ym(METRIKA_ID, "hit", url, { title: document.title, referer: previous ?? document.referrer });
    previous = url;
  }, [allowed, pathname]);

  return allowed ? <Script id="ym-tag" src="https://mc.yandex.ru/metrika/tag.js" strategy="afterInteractive" /> : null;
}
