/**
 * Конструктор анкеты RSVP — «как в Google Формах»: поля добавляются,
 * убираются, переставляются, у каждого свой тип. Анкета одна на
 * мероприятие и показывается в любом шаблоне приглашения — в его стиле.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { loadBuilder } from "./actions";
import { RsvpFormBuilder } from "./rsvp-form-builder";

export const dynamic = "force-dynamic";

export default async function RsvpFormPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const initial = await loadBuilder(eventId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href={`/app/e/${eventId}/invite`} className="inline-flex min-h-11 items-center text-sm text-stone-500 hover:text-stone-900">
        ← Приглашение
      </Link>
      <RsvpFormBuilder eventId={eventId} initial={initial} allowPlusOne={event.allowPlusOne} />
    </main>
  );
}
