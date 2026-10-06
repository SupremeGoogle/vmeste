import { BrandLogo } from "@/components/brand";
/**
 * «Проверьте почту» после регистрации — и повторная отправка письма.
 * Что именно ушло на адрес (подтверждение или «кабинет уже есть»), здесь
 * не говорится: страница не должна выдавать, зарегистрирован ли адрес.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { rateLimit } from "@/server/rate-limit";
import { normalizeEmail, resendVerification } from "@/server/services/email-auth";

export const dynamic = "force-dynamic";

async function resend(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const back = `/register/check?email=${encodeURIComponent(email)}`;
  // Не чаще трёх писем в 15 минут на адрес — иначе формой можно заваливать чужой ящик.
  if (!rateLimit(`resend:${email}`, 3, 15 * 60_000).ok) redirect(`${back}&sent=rate`);
  await resendVerification(email);
  redirect(`${back}&sent=1`);
}

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; sent?: string; unverified?: string }> }) {
  const { email = "", sent, unverified } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-5 py-16 text-center sm:px-6 sm:py-20">
      <p><Link href="/" className="font-serif text-2xl tracking-wide"><BrandLogo size={64} /></Link></p>
      <h1 className="mt-8 text-3xl">Проверьте почту</h1>
      {unverified && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Почта ещё не подтверждена — кабинет откроется после ссылки из письма.</p>}
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        Мы отправили письмо{email ? <> на <b className="text-stone-900">{email}</b></> : null}.
        Откройте его и нажмите «Подтвердить почту» — кабинет откроется сразу.
      </p>
      <p className="mt-3 text-xs text-stone-500">Письмо идёт до пары минут. Нет во «Входящих» — загляните в «Спам» и «Промоакции».</p>

      <form action={resend} className="mt-8">
        <input type="hidden" name="email" value={email} />
        <button className="rounded-lg border border-stone-300 bg-card px-4 py-2 text-sm">Отправить письмо ещё раз</button>
      </form>
      {sent === "1" && <p className="mt-3 text-sm text-emerald-700">Отправили ещё раз.</p>}
      {sent === "rate" && <p className="mt-3 text-sm text-red-700">Писем уже несколько — подождите 15 минут.</p>}

      <p className="mt-10 text-sm text-stone-600">
        Ошиблись адресом? <Link href="/register" className="underline">Зарегистрироваться заново</Link>
        <br />Уже подтвердили? <Link href="/login" className="underline">Войти</Link>
      </p>
    </main>
  );
}
