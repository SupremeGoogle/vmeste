"use server";

import { revalidatePath } from "next/cache";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { getT } from "@/server/i18n";
import { saveGuestAppearance } from "@/server/services/guest-appearance";
import { readGuestAppearance } from "@/lib/guest-appearance";
import type { GuestAppearanceState } from "@/components/guest/appearance/guest-appearance-picker";

export async function updateGuestAppearance(eventId: string, _previous: GuestAppearanceState, data: FormData): Promise<GuestAppearanceState> {
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  const t = await getT();
  if (!event) return { ok: false, message: t("Мероприятие не найдено.", "Event not found.") };
  const id = String(data.get("appearanceId") ?? "");
  const savedId = readGuestAppearance(event.printDesign)?.id ?? "original";
  try {
    if (!await saveGuestAppearance(ctx, id)) return { ok: false, id: savedId, message: t("Выберите оформление из списка.", "Choose a design from the list.") };
  } catch {
    return { ok: false, id: savedId, message: t("Не удалось сохранить. Попробуйте ещё раз.", "Couldn’t save your design. Please try again.") };
  }
  revalidatePath(`/app/e/${eventId}/print`);
  revalidatePath(`/g/${event.shortCode}`, "layout");
  return { ok: true, id, message: t("Оформление сохранено. Гости увидят его при следующем открытии страницы.", "Design saved. Guests will see it the next time they open the page.") };
}
