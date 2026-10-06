/** Вкладка «Ответы» стала видом «Ответы анкеты» в «Гостях» — старые ссылки ведут туда. */
import { redirect } from "next/navigation";

export default async function RsvpRedirect({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  redirect(`/app/e/${eventId}/guests?tab=answers`);
}
