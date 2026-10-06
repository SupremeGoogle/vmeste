import { BrandLogo } from "@/components/brand";
/**
 * «Забыли пароль?» — письмо со ссылкой на новый пароль. Ответ одинаковый,
 * есть кабинет или нет: форма не должна выдавать, чьи адреса у нас есть.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { rateLimit } from "@/server/rate-limit";
import { requestOrigin } from "@/server/auth/session";
import { normalizeEmail, requestPasswordReset } from "@/server/services/email-auth";

export const dynamic = "force-dynamic";

async function forgot(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const { ip } = await requestOrigin();
  if (!rateLimit(`forgot:${email}`, 3, 15 * 60_000).ok || !rateLimit(`forgot-ip:${ip ?? "?"}`, 20, 3_600_000).ok) {
    redirect("/forgot?sent=rate");
  }
  await requestPasswordReset(email);
  redirect(`/forgot?sent=1&email=${encodeURIComponent(email)}`);
}

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string; email?: string }> }) {
  const { sent, email } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <p className="text-center"><Link href="/" className="font-serif text-2xl tracking-wide"><BrandLogo size={64} /></Link></p>
      <h1 className="mt-8 text-center text-3xl">Новый пароль</h1>
      {sent === "1" ? (
        <p className="mt-6 text-center text-sm leading-relaxed text-stone-600">
          Если кабинет на <b className="text-stone-900">{email}</b> есть, письмо со ссылкой уже в пути. Ссылка работает 1 час.
          Нет письма — проверьте «Спам».
        </p>
      ) : (
        <>
          <p className="mt-2 text-center text-sm text-stone-600">Пришлём ссылку, по которой можно придумать новый пароль</p>
          <form action={forgot} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm text-stone-600" htmlFor="email">Почта кабинета</label>
              <input id="email" name="email" type="email" required maxLength={200} autoComplete="email"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2" />
            </div>
            {sent === "rate" && <p className="text-sm text-red-700">Писем уже несколько — подождите 15 минут.</p>}
            <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">Прислать ссылку</button>
          </form>
        </>
      )}
      <p className="mt-8 text-center text-sm text-stone-600"><Link href="/login" className="underline">Вернуться ко входу</Link></p>
    </main>
  );
}
