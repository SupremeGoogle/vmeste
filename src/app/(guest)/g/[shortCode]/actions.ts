"use server";

import { revalidatePath } from "next/cache";
import { findEventByShortCode } from "@/server/repositories/events";
import { identifyByEventSession } from "@/server/guest-access/identify";
import { clearGuestSession } from "@/server/guest-access/session";
import { createWish } from "@/server/services/wishes";
import { makeT, parseLang } from "@/lib/i18n";

export type WishState = { ok: boolean; message: string | null };

/** Пожелание со страницы гостя. Гость опознан cookie — подпись по умолчанию его имя. */
export async function sendWish(shortCode: string, _prev: WishState, form: FormData): Promise<WishState> {
  const event = await findEventByShortCode(shortCode);
  if (!event) return { ok: false, message: "Мероприятие не найдено · Event not found" };
  const t = makeT(parseLang(event.language) ?? "ru");
  const guest = await identifyByEventSession(event.id);
  if (!guest) return { ok: false, message: t("Найдите себя по имени ещё раз", "Please find yourself by name again") };

  const result = await createWish(
    { orgId: guest.orgId, eventId: guest.eventId, guestId: guest.guestId },
    { authorName: String(form.get("authorName") ?? ""), text: String(form.get("text") ?? "") },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath(`/g/${shortCode}`);
  return { ok: true, message: null };
}

/** «Это не я» — снять сессию и вернуться к поиску по имени. */
export async function forgetMe(shortCode: string) {
  const event = await findEventByShortCode(shortCode);
  if (event) await clearGuestSession(event.id);
  revalidatePath(`/g/${shortCode}`);
}
