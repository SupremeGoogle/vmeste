import { BrandLogo } from "@/components/brand";
/**
 * Ввод кода из письма после регистрации — и повторная отправка кода.
 *
 * Что именно ушло на адрес (код или «кабинет уже есть»), здесь не
 * говорится: страница не должна выдавать, зарегистрирован ли адрес.
 * Подбор кода закрыт дважды: 5 попыток на код (services/email-auth.ts) и
 * лимит попыток на адрес почты и на IP здесь.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { rateLimit } from "@/server/rate-limit";
import { createSession, requestOrigin } from "@/server/auth/session";
import { AUTH_MESSAGES, confirmEmailCode, normalizeEmail, resendVerification } from "@/server/services/email-auth";

export const dynamic = "force-dynamic";

const page = (email: string, query: string) => `/register/check?email=${encodeURIComponent(email)}&${query}`;

async function confirm(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const { ip } = await requestOrigin();
  if (!rateLimit(`code:${email}`, 10, 10 * 60_000).ok || !rateLimit(`code-ip:${ip ?? "?"}`, 40, 10 * 60_000).ok) {
    redirect(page(email, "error=rate"));
  }
  const result = await confirmEmailCode(email, String(formData.get("code") ?? ""));
  if (!result.ok) redirect(page(email, `error=${result.code}${result.left ? `&left=${result.left}` : ""}`));
  await createSession(result.userId);
  redirect("/app");
}

async function resend(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  // Не чаще трёх писем в 15 минут на адрес — иначе формой можно заваливать чужой ящик.
  if (!rateLimit(`resend:${email}`, 3, 15 * 60_000).ok) redirect(page(email, "sent=rate"));
  await resendVerification(email);
  redirect(page(email, "sent=1"));
}

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string; unverified?: string; error?: string; left?: string }>;
}) {
  const { email = "", sent, unverified, error, left } = await searchParams;
  const message = error && error in AUTH_MESSAGES ? AUTH_MESSAGES[error as keyof typeof AUTH_MESSAGES] : null;
  const tries = Number(left);

  return (
    <main className="mx-auto max-w-sm px-5 py-16 text-center sm:px-6 sm:py-20">
      <p><Link href="/" className="font-serif text-2xl tracking-wide"><BrandLogo size={64} /></Link></p>
      <h1 className="mt-8 text-3xl">Код из письма</h1>
      {unverified && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Почта ещё не подтверждена — введите код из письма.</p>}
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        Мы отправили 6 цифр{email ? <> на <b className="text-stone-900">{email}</b></> : null}. Код действует 15 минут.
      </p>

      <form action={confirm} className="mt-8 space-y-4">
        <input type="hidden" name="email" value={email} />
        <label className="sr-only" htmlFor="code">Код из письма</label>
        <input
          id="code" name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}" maxLength={7} placeholder="000 000"
          className="w-full rounded-xl border border-stone-300 bg-card px-4 py-3 text-center font-mono text-3xl tracking-[0.3em]"
        />
        {message && (
          <p className="text-sm text-red-700">
            {message}{error === "code_wrong" && tries > 0 ? ` Осталось попыток: ${tries}.` : ""}
          </p>
        )}
        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white" data-rybbit-event="email_code">
          Подтвердить
        </button>
      </form>

      <p className="mt-6 text-xs text-stone-500">Письмо идёт до минуты. Нет во «Входящих» — загляните в «Спам» и «Промоакции».</p>
      <form action={resend} className="mt-4">
        <input type="hidden" name="email" value={email} />
        <button className="rounded-lg border border-stone-300 bg-card px-4 py-2 text-sm">Прислать новый код</button>
      </form>
      {sent === "1" && <p className="mt-3 text-sm text-emerald-700">Отправили новый код — прежний больше не действует.</p>}
      {sent === "rate" && <p className="mt-3 text-sm text-red-700">Писем уже несколько — подождите 15 минут.</p>}

      <p className="mt-10 text-sm text-stone-600">
        Ошиблись адресом? <Link href="/register" className="underline">Зарегистрироваться заново</Link>
        <br />Уже подтвердили? <Link href="/login" className="underline">Войти</Link>
      </p>
    </main>
  );
}
