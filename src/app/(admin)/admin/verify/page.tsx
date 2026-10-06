/**
 * Второй замок панели суперадмина: код из приложения-аутентификатора.
 * Первый вход — настройка (QR-код и резервные коды), дальше — только код.
 */
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { beginSetup, getAdminIdentity, verifySecondFactor, type VerifyResult } from "@/server/admin/access";
import { adminKey } from "@/server/admin/config";
import { VerifyForm } from "../verify-form";

export const dynamic = "force-dynamic";

// Заголовок — только когда страница и правда показана администратору.
export async function generateMetadata() {
  return { title: (await getAdminIdentity()) ? "Вместе — вход в управление" : "Вместе" };
}

async function verify(code: string): Promise<VerifyResult> {
  "use server";
  const admin = await getAdminIdentity();
  if (!admin) return { ok: false, message: "Сессия устарела — войдите заново." };
  return verifySecondFactor(admin, code);
}

export default async function VerifyPage() {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  if (admin.elevated && admin.secondFactorReady) redirect("/admin");

  if (!adminKey()) {
    return (
      <Shell title="Панель не настроена">
        <p className="text-sm leading-relaxed text-stone-600">
          На сервере не задана переменная <code className="rounded bg-stone-100 px-1">ADMIN_SECRET</code> (не короче 32 символов).
          Ею шифруется секрет второго фактора — без неё панель не открывается.
        </p>
      </Shell>
    );
  }

  if (!admin.secondFactorReady) {
    const setup = await beginSetup(admin);
    if ("error" in setup) return <Shell title="Второй фактор"><p className="text-sm text-red-700">{setup.error}</p></Shell>;
    const qr = await QRCode.toDataURL(setup.url, { margin: 1, width: 220 });
    return (
      <Shell title="Включите второй фактор">
        <ol className="space-y-2 text-sm leading-relaxed text-stone-600">
          <li>1. Откройте Google Authenticator, Яндекс Ключ или другое приложение кодов.</li>
          <li>2. Отсканируйте QR-код или введите ключ вручную.</li>
          <li>3. Введите шесть цифр из приложения.</li>
        </ol>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR-код для приложения-аутентификатора" width={220} height={220} className="mx-auto mt-5 rounded-lg border border-stone-200 bg-white p-2" />
        <p className="mt-3 text-center font-mono text-xs break-all text-stone-500 select-all">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</p>
        <VerifyForm action={verify} setup />
      </Shell>
    );
  }

  return (
    <Shell title="Код из приложения">
      <p className="text-sm text-stone-600">Вы вошли как {admin.email}. Введите шесть цифр из приложения-аутентификатора или резервный код.</p>
      <VerifyForm action={verify} />
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Управление платформой</p>
        <h1 className="mt-1 font-serif text-3xl">{title}</h1>
        <div className="mt-5">{children}</div>
      </div>
      <p className="mt-4 text-center text-xs text-stone-400">Каждая попытка входа записывается в журнал.</p>
    </main>
  );
}
