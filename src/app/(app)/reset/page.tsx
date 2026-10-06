import { BrandLogo } from "@/components/brand";
/**
 * Новый пароль по ссылке из письма. Ссылка одноразовая; после смены все
 * прежние сессии гаснут, а человек сразу входит в кабинет.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSession } from "@/server/auth/session";
import { AUTH_MESSAGES, PASSWORD_MIN, resetPasswordWithToken, type AuthCode } from "@/server/services/email-auth";

export const dynamic = "force-dynamic";

async function reset(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const back = (code: AuthCode) => redirect(`/reset?token=${encodeURIComponent(token)}&error=${code}`);
  if (password !== String(formData.get("confirm") ?? "")) back("password_mismatch");
  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) back(result.code);
  else {
    await createSession(result.userId);
    redirect("/app");
  }
}

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
  const message = error ? AUTH_MESSAGES[error as AuthCode] ?? "Не получилось, попробуйте ещё раз." : null;
  return (
    <main className="mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <p className="text-center"><Link href="/" className="font-serif text-2xl tracking-wide"><BrandLogo size={64} /></Link></p>
      <h1 className="mt-8 text-center text-3xl">Новый пароль</h1>
      <form action={reset} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="block text-sm text-stone-600" htmlFor="password">Новый пароль</label>
          <input id="password" name="password" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2" />
          <p className="mt-1 text-xs text-stone-500">Не короче {PASSWORD_MIN} символов</p>
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="confirm">Ещё раз</label>
          <input id="confirm" name="confirm" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2" />
        </div>
        {message && (
          <p className="text-sm text-red-700">
            {message}{error === "link" && <> <Link href="/forgot" className="underline">Запросить новую ссылку</Link></>}
          </p>
        )}
        <button type="submit" className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white">Сохранить и войти</button>
      </form>
    </main>
  );
}
