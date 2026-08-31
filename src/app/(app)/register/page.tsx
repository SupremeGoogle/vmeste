/**
 * Создание кабинета — только через Google.
 *
 * Форма с паролем отсюда убрана намеренно. Пароль, который организатор
 * придумает за минуту до первой свадьбы, — это будущий звонок «я не могу
 * войти, а гости уже едут»: его теряют, повторяют с других сервисов и
 * никогда не меняют. Google снимает с нас и восстановление доступа, и
 * подтверждение почты, и двухфакторную защиту, которую мы бы иначе делали
 * сами и хуже.
 *
 * Вход по паролю при этом остался (`/login`): у заведённых раньше
 * пользователей он работает, и им же пользуются сид и скрипты проверки.
 * Убрать регистрацию и убрать вход — разные вещи.
 *
 * Кабинет заводит не эта страница, а возврат от Google
 * (`api/auth/google/callback`) через общий `services/signup.ts`.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { googleEnabled } from "@/server/auth/google";
import { GoogleButton } from "../_auth/google-button";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  google_off: "Вход через Google пока не настроен.",
  google_cancel: "Вход через Google отменён — попробуйте ещё раз.",
  google_state: "Ссылка входа устарела, начните заново.",
  google_fail: "Google не подтвердил вход. Попробуйте ещё раз.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");
  const { error } = await searchParams;
  const enabled = googleEnabled();

  return (
    <main className="mx-auto max-w-sm px-5 py-16 sm:px-6 sm:py-20">
      <p className="text-center">
        <Link href="/" className="font-serif text-2xl tracking-wide">Вместе</Link>
      </p>
      <h1 className="mt-8 text-center text-3xl">Создать кабинет</h1>
      <p className="mt-2 text-center text-sm text-stone-600">
        Бесплатно, первая свадьба целиком
      </p>
      <div className="mx-auto my-7 h-px w-12 bg-stone-200" />

      {enabled ? (
        <>
          <GoogleButton label="Продолжить с Google" />
          <p className="mt-4 text-center text-xs leading-relaxed text-stone-500">
            Пароль придумывать не нужно: кабинет открывается вашей почтой в
            Google. Мы получаем только имя, адрес почты и фотографию профиля.
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Вход через Google пока не настроен на этом сервере. Напишите нам —
          заведём кабинет руками.
        </p>
      )}

      {error && <p className="mt-5 text-center text-sm text-red-700">{ERRORS[error] ?? "Не получилось, попробуйте ещё раз."}</p>}

      <div className="mt-10 rounded-xl border border-stone-200 bg-white/60 p-5">
        <p className="text-sm text-stone-900">Что будет дальше</p>
        <ol className="mt-3 space-y-2 text-sm text-stone-600">
          <li>1. Google спросит, каким аккаунтом войти.</li>
          <li>2. Мы заведём кабинет и вашу студию в нём.</li>
          <li>3. Вы окажетесь на списке мероприятий — пустом.</li>
        </ol>
      </div>

      <p className="mt-6 text-center text-sm text-stone-600">
        Уже есть кабинет? <Link href="/login" className="underline">Войти</Link>
      </p>
    </main>
  );
}
