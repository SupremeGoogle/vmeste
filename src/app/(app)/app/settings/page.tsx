/**
 * Организация и участники.
 *
 * Экран из трёх вещей, за которыми иначе пришлось бы лезть в базу:
 * название агентства, состав и смена собственного пароля. Регистрации
 * в MVP нет — пользователей заводит сид, — и это честно написано прямо
 * на странице, чтобы никто не искал кнопку «пригласить».
 */
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/server/context";
import { currentSessionId } from "@/server/auth/session";
import {
  changeOwnPassword, closeOtherSessions, getOrganization, listMembers, renameOrganization,
} from "@/server/repositories/org";

export const dynamic = "force-dynamic";

const ROLE: Record<string, string> = {
  OWNER: "владелец",
  PLANNER: "организатор",
  STAFF: "помощник",
};

const MESSAGES: Record<string, string> = {
  ok: "Пароль изменён, остальные сессии закрыты",
  wrong: "Текущий пароль не подошёл",
  weak: "Новый пароль короче десяти символов",
  gone: "Пользователь не найден",
  renamed: "Название сохранено",
  closed: "Остальные сессии закрыты",
};

type Props = { searchParams: Promise<{ msg?: string }> };

export default async function OrgSettingsPage({ searchParams }: Props) {
  const { msg } = await searchParams;
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const [org, members] = await Promise.all([getOrganization(ctx), listMembers(ctx)]);
  if (!org) redirect("/login");

  async function rename(formData: FormData) {
    "use server";
    const ctx = await getOrgContext();
    if (!ctx) redirect("/login");
    await renameOrganization(ctx, String(formData.get("name") ?? ""));
    redirect("/app/settings?msg=renamed");
  }

  async function changePassword(formData: FormData) {
    "use server";
    const ctx = await getOrgContext();
    if (!ctx) redirect("/login");

    const result = await changeOwnPassword(
      ctx,
      String(formData.get("current") ?? ""),
      String(formData.get("next") ?? ""),
      await currentSessionId(),
    );
    redirect(`/app/settings?msg=${result}`);
  }

  async function closeSessions() {
    "use server";
    const ctx = await getOrgContext();
    if (!ctx) redirect("/login");
    await closeOtherSessions(ctx, await currentSessionId());
    revalidatePath("/app/settings");
    redirect("/app/settings?msg=closed");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/app" className="text-sm text-stone-500 underline">
        ← к мероприятиям
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Организация</h1>

      {msg && MESSAGES[msg] ? (
        <p
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            msg === "ok" || msg === "renamed" || msg === "closed"
              ? "bg-stone-900 text-white"
              : "bg-red-50 text-red-800"
          }`}
        >
          {MESSAGES[msg]}
        </p>
      ) : null}

      <form action={rename} className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 bg-white p-4">
        <label className="flex-1">
          <span className="text-xs text-stone-500">Название</span>
          <input
            name="name" defaultValue={org.name}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Сохранить</button>
        <p className="w-full text-xs text-stone-400">
          Мероприятий: {org._count.events}. Название видят только сотрудники —
          гостю показывается название свадьбы.
        </p>
      </form>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium">Участники</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                {member.user.name}
                <span className="ml-2 text-stone-500">{member.user.email}</span>
                {member.user.id === ctx.userId ? (
                  <span className="ml-2 text-xs text-stone-400">это вы</span>
                ) : null}
              </span>
              <span className="text-xs text-stone-500">
                {ROLE[member.role]} · открытых сессий: {member.user._count.sessions}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-400">
          Регистрации нет: пользователей заводит `npm run db:seed`. Роли в базе
          есть, но прав пока не ограничивают — разграничение появится, когда
          станет понятно, что именно нужно закрывать.
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium">Ваш пароль</h2>
        <form action={changePassword} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="text-xs text-stone-500">Текущий</span>
            <input
              type="password" name="current" required autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-stone-500">Новый (от 10 символов)</span>
            <input
              type="password" name="next" required minLength={10} autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Сменить</button>
        </form>
        <form action={closeSessions} className="mt-3">
          <button className="text-xs text-stone-500 underline">
            Закрыть все остальные сессии
          </button>
          <span className="ml-3 text-xs text-stone-400">
            Если забыли выйти на чужом ноутбуке в зале.
          </span>
        </form>
      </section>
    </main>
  );
}
