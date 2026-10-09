/**
 * Конструктор анкеты RSVP — «как в Google Формах»: поля добавляются,
 * убираются, переставляются, у каждого свой тип. Анкета одна на
 * мероприятие и показывается в любом шаблоне приглашения — в его стиле.
 *
 * Когда приглашение уже собрано, анкета правится прямо в нём: этот адрес
 * ведёт в редактор и сразу открывает конструктор на весь экран. Отдельной
 * страницей она остаётся только до выбора шаблона.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { getT } from "@/server/i18n";
import { parseLang } from "@/lib/i18n";
import { loadBuilder } from "./actions";
import { RsvpFormBuilder } from "./rsvp-form-builder";

export const dynamic = "force-dynamic";

export default async function RsvpFormPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  if (await db.inviteBlock.count({ where: { eventId } })) redirect(`/app/e/${eventId}/invite?edit=1&rsvp=1`);
  const initial = await loadBuilder(eventId);
  const t = await getT();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href={`/app/e/${eventId}/invite`} className="inline-flex min-h-11 items-center text-sm text-stone-500 hover:text-stone-900">
        {t("← Приглашение", "← Invitation")}
      </Link>
      <RsvpFormBuilder eventId={eventId} initial={initial} allowPlusOne={event.allowPlusOne} guestLang={parseLang(event.language) ?? "ru"} />
    </main>
  );
}
