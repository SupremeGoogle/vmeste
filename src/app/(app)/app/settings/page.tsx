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
import { getT } from "@/server/i18n";
import type { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const ROLE = (t: T): Record<string, string> => ({
  OWNER: t("владелец", "owner"),
  PLANNER: t("организатор", "planner"),
  STAFF: t("помощник", "assistant"),
});

const MESSAGES = (t: T): Record<string, string> => ({
  ok: t("Пароль изменён, остальные сессии закрыты", "Password changed — all other sessions have been signed out"),
  wrong: t("Текущий пароль не подошёл", "Your current password is incorrect"),
  weak: t("Новый пароль короче десяти символов", "The new password is shorter than 10 characters"),
  gone: t("Пользователь не найден", "User not found"),
  renamed: t("Название сохранено", "Name saved"),
  closed: t("Остальные сессии закрыты", "All other sessions have been signed out"),
});

type Props = { searchParams: Promise<{ msg?: string }> };

export default async function OrgSettingsPage({ searchParams }: Props) {
  const { msg } = await searchParams;
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const [org, members] = await Promise.all([getOrganization(ctx), listMembers(ctx)]);
  if (!org) redirect("/login");
  const t = await getT();
  const messages = MESSAGES(t);
  const roles = ROLE(t);

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
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/app" className="text-sm text-stone-500 underline">
        {t("← к мероприятиям", "← Back to events")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">{t("Организация", "Organization")}</h1>

      {msg && messages[msg] ? (
        <p
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            msg === "ok" || msg === "renamed" || msg === "closed"
              ? "bg-stone-900 text-white"
              : "bg-red-50 text-red-800"
          }`}
        >
          {messages[msg]}
        </p>
      ) : null}

      <form action={rename} className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 bg-card p-4">
        <label className="flex-1">
          <span className="text-xs text-stone-500">{t("Название", "Name")}</span>
          <input
            name="name" defaultValue={org.name}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">{t("Сохранить", "Save")}</button>
        <p className="w-full text-xs text-stone-400">
          {t(
            `Мероприятий: ${org._count.events}. Название видят только сотрудники — гостю показывается название свадьбы.`,
            `Events: ${org._count.events}. Only your team sees this name — guests see the wedding name.`,
          )}
        </p>
      </form>

      <section className="mt-4 rounded-xl border border-stone-200 bg-card p-4">
        <h2 className="text-sm font-medium">{t("Участники", "Members")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                {member.user.name}
                <span className="ml-2 text-stone-500">{member.user.email}</span>
                {member.user.id === ctx.userId ? (
                  <span className="ml-2 text-xs text-stone-400">{t("это вы", "you")}</span>
                ) : null}
              </span>
              <span className="text-xs text-stone-500">
                {roles[member.role]} · {t("открытых сессий", "active sessions")}: {member.user._count.sessions}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-400">
          {t(
            "Регистрации нет: пользователей заводит `npm run db:seed`. Роли в базе есть, но прав пока не ограничивают — разграничение появится, когда станет понятно, что именно нужно закрывать.",
            "There’s no sign-up here: users are created by `npm run db:seed`. Roles exist in the database but don’t restrict access yet — permissions will come once it’s clear what needs restricting.",
          )}
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-card p-4">
        <h2 className="text-sm font-medium">{t("Ваш пароль", "Your password")}</h2>
        <form action={changePassword} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="text-xs text-stone-500">{t("Текущий", "Current")}</span>
            <input
              type="password" name="current" required autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-stone-500">{t("Новый (от 10 символов)", "New (10+ characters)")}</span>
            <input
              type="password" name="next" required minLength={10} autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">{t("Сменить", "Change")}</button>
        </form>
        <form action={closeSessions} className="mt-3">
          <button className="text-xs text-stone-500 underline">
            {t("Закрыть все остальные сессии", "Sign out all other sessions")}
          </button>
          <span className="ml-3 text-xs text-stone-400">
            {t("Если забыли выйти на чужом ноутбуке в зале.", "In case you forgot to sign out on someone else’s laptop at the venue.")}
          </span>
        </form>
      </section>
    </main>
  );
}
