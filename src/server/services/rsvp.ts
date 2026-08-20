/**
 * Ответ гостя на приглашение.
 *
 * Три вещи, которые определяют всю логику ниже:
 *
 * 1. **Ответ идемпотентен.** Гость отвечает с телефона, жмёт «отправить»
 *    дважды, потом через неделю передумывает. Это должно быть одной строкой
 *    в базе, а не тремя: у организатора список гостей, а не лента событий.
 *    Поэтому здесь `update` по гостю, а не `create` ответа.
 *
 * 2. **+1 — это настоящий гость, а не строка «плюс один» в поле.** Иначе
 *    спутника нельзя посадить за стол, он не найдёт себя на входе по QR
 *    и не попадёт в PDF. Поэтому при ответе создаётся Guest с
 *    `parentGuestId`, ключом поиска и алиасами — ровно как обычный гость.
 *
 * 3. **Форма ответа не должна разрешать больше, чем разрешил организатор.**
 *    Блюдо проверяется по списку мероприятия, +1 — по двум флагам сразу
 *    (`Event.allowPlusOne` и `Guest.plusOneAllowed`), срок — по `rsvpDeadline`.
 *    Проверка на стороне сервера, потому что форму открывают в браузере, и
 *    поле `mealOptionId` в ней можно поправить руками.
 */
import { z } from "zod";
import { db } from "@/server/db";
import { normalizeName } from "@/lib/name-normalize";
import { expandGuestName } from "@/server/services/diminutives";
import { generateLinkToken } from "@/server/repositories/guests";

export const rsvpInputSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
  mealOptionId: z.string().trim().max(40).nullable().default(null),
  allergies: z.string().trim().max(500).default(""),
  comment: z.string().trim().max(500).default(""),
  plusOneName: z.string().trim().max(120).default(""),
});

export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export type RsvpResult =
  | { ok: true; status: "ACCEPTED" | "DECLINED"; plusOneName: string | null }
  | { ok: false; reason: "gone" | "deadline" | "invalid"; message: string };

/**
 * @param linkToken токен именной ссылки — он же удостоверяет личность гостя.
 */
export async function submitRsvp(linkToken: string, raw: unknown): Promise<RsvpResult> {
  const parsed = rsvpInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: "Проверьте заполнение формы" };
  }
  const input = parsed.data;

  const guest = await db.guest.findUnique({
    where: { linkToken },
    select: {
      id: true, orgId: true, eventId: true, archivedAt: true,
      plusOneAllowed: true, parentGuestId: true,
      event: { select: { allowPlusOne: true, rsvpDeadline: true } },
    },
  });
  if (!guest || guest.archivedAt) {
    return { ok: false, reason: "gone", message: "Приглашение не найдено" };
  }

  const deadline = guest.event.rsvpDeadline;
  if (deadline && Date.now() > deadline.getTime()) {
    return {
      ok: false,
      reason: "deadline",
      message: "Срок ответа истёк — напишите организатору, он изменит вручную",
    };
  }

  // Блюдо: только из списка мероприятия и только у тех, кто придёт.
  let mealOptionId: string | null = null;
  if (input.status === "ACCEPTED" && input.mealOptionId) {
    const meal = await db.mealOption.findFirst({
      where: { id: input.mealOptionId, eventId: guest.eventId, active: true },
      select: { id: true },
    });
    if (!meal) return { ok: false, reason: "invalid", message: "Такого блюда нет в меню" };
    mealOptionId = meal.id;
  }

  // Спутника приводит только приглашённый и только с разрешения обеих сторон.
  // Спутник спутника не приводит — иначе список гостей растёт цепочкой.
  const plusOneAllowed =
    guest.event.allowPlusOne && guest.plusOneAllowed && guest.parentGuestId === null;
  const plusOneName =
    input.status === "ACCEPTED" && plusOneAllowed ? input.plusOneName.trim() : "";

  await db.$transaction(async (tx) => {
    await tx.guest.update({
      where: { eventId_id: { eventId: guest.eventId, id: guest.id } },
      data: {
        rsvpStatus: input.status,
        rsvpAt: new Date(),
        mealOptionId,
        allergies: input.status === "ACCEPTED" ? input.allergies || null : null,
        comment: input.comment || null,
        plusOneName: plusOneName || null,
      },
    });

    const existing = await tx.guest.findFirst({
      where: { eventId: guest.eventId, parentGuestId: guest.id, archivedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, displayName: true },
    });

    if (plusOneName) {
      if (existing) {
        if (existing.displayName !== plusOneName) {
          // Имя спутника поменяли — переписываем и ключ поиска, и алиасы,
          // иначе на входе он найдётся под старым именем.
          await tx.guestAlias.deleteMany({ where: { eventId: guest.eventId, guestId: existing.id } });
          await tx.guest.update({
            where: { eventId_id: { eventId: guest.eventId, id: existing.id } },
            data: {
              displayName: plusOneName,
              searchKey: normalizeName(plusOneName),
              rsvpStatus: "ACCEPTED",
              rsvpAt: new Date(),
              aliases: {
                create: expandGuestName(plusOneName).map((alias) => ({ orgId: guest.orgId, alias })),
              },
            },
          });
        }
      } else {
        await tx.guest.create({
          data: {
            orgId: guest.orgId,
            eventId: guest.eventId,
            displayName: plusOneName,
            searchKey: normalizeName(plusOneName),
            parentGuestId: guest.id,
            rsvpStatus: "ACCEPTED",
            rsvpAt: new Date(),
            linkToken: generateLinkToken(),
            note: "Спутник (+1)",
            aliases: {
              create: expandGuestName(plusOneName).map((alias) => ({ orgId: guest.orgId, alias })),
            },
          },
        });
      }
    } else if (existing) {
      // Передумали брать спутника: он уходит в архив, а не удаляется —
      // за ним может уже числиться место за столом. Место освобождаем явно,
      // составной внешний ключ объявлен Restrict и сам не отпустит.
      await tx.seat.updateMany({
        where: { eventId: guest.eventId, guestId: existing.id },
        data: { guestId: null },
      });
      await tx.guest.update({
        where: { eventId_id: { eventId: guest.eventId, id: existing.id } },
        data: { archivedAt: new Date() },
      });
    }

    await tx.guestActionLog.create({
      data: {
        orgId: guest.orgId,
        eventId: guest.eventId,
        guestId: guest.id,
        action: "rsvp_submit",
        detail: `${input.status}${plusOneName ? " +1" : ""}`,
      },
    });
  });

  return { ok: true, status: input.status, plusOneName: plusOneName || null };
}

/** Сводка ответов для панели организатора. */
export async function rsvpSummary(eventId: string) {
  const [byStatus, meals, plusOnes, notOpened] = await Promise.all([
    db.guest.groupBy({
      by: ["rsvpStatus"],
      where: { eventId, archivedAt: null },
      _count: { _all: true },
    }),
    db.guest.groupBy({
      by: ["mealOptionId"],
      where: { eventId, archivedAt: null, rsvpStatus: "ACCEPTED" },
      _count: { _all: true },
    }),
    db.guest.count({ where: { eventId, archivedAt: null, parentGuestId: { not: null } } }),
    db.guest.count({ where: { eventId, archivedAt: null, linkOpenedAt: null } }),
  ]);

  const count = (status: string) =>
    byStatus.find((row) => row.rsvpStatus === status)?._count._all ?? 0;

  const options = await db.mealOption.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  return {
    total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
    accepted: count("ACCEPTED"),
    declined: count("DECLINED"),
    pending: count("PENDING"),
    plusOnes,
    notOpened,
    meals: [
      ...options.map((option) => ({
        id: option.id,
        title: option.title,
        count: meals.find((row) => row.mealOptionId === option.id)?._count._all ?? 0,
      })),
      {
        id: null,
        title: "Не выбрано",
        count: meals.find((row) => row.mealOptionId === null)?._count._all ?? 0,
      },
    ],
  };
}

/**
 * Ответ, проставленный организатором вручную.
 *
 * Нужен ровно потому, что срок ответа истекает, а гости звонят по телефону:
 * форма гостю уже отказывает, и без этой ручки координатору пришлось бы
 * лезть в базу. Спутника здесь не трогаем — если гость передумал приходить
 * вдвоём, это правится на карточке гостя.
 */
export async function setRsvpManually(
  ctx: { orgId: string; eventId: string; userId: string },
  guestId: string,
  status: "PENDING" | "ACCEPTED" | "DECLINED",
) {
  const updated = await db.guest.updateMany({
    where: { id: guestId, eventId: ctx.eventId, archivedAt: null },
    data: {
      rsvpStatus: status,
      rsvpAt: status === "PENDING" ? null : new Date(),
    },
  });
  if (updated.count === 0) return false;

  await db.guestActionLog.create({
    data: {
      orgId: ctx.orgId,
      eventId: ctx.eventId,
      guestId,
      action: "rsvp_manual",
      detail: `${status} (организатор ${ctx.userId})`,
    },
  });
  return true;
}

/** Список гостей с ответами — для сводки организатора. */
export async function listRsvp(eventId: string) {
  return db.guest.findMany({
    where: { eventId, archivedAt: null },
    orderBy: [{ rsvpStatus: "asc" }, { searchKey: "asc" }],
    select: {
      id: true, displayName: true, rsvpStatus: true, rsvpAt: true,
      allergies: true, comment: true, linkToken: true, linkOpenedAt: true,
      parentGuestId: true, plusOneName: true,
      mealOption: { select: { title: true } },
      parentGuest: { select: { displayName: true } },
    },
  });
}
