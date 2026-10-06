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
 *    поле `mealOptionId` в ней можно поправить руками. С напитками так же.
 */
import { z } from "zod";
import { db } from "@/server/db";
import { normalizeName } from "@/lib/name-normalize";
import { expandGuestName } from "@/server/services/diminutives";
import { generateLinkToken, ONLY_GUESTS } from "@/server/repositories/guests";
import { effectiveRsvpQuestions } from "@/server/repositories/rsvp-questions";
import { checkAnswers, parseStoredAnswers, type RsvpQuestion } from "@/lib/rsvp-form";

export const rsvpInputSchema = z.object({
  /**
   * Имя, как его написал сам гость. В именной ссылке поле уже заполнено
   * организатором, но гость может поправить опечатку или дописать фамилию.
   * `undefined` — формы без поля имени: имя не трогаем.
   */
  guestName: z.string().trim().max(120).optional(),
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED"]),
  mealOptionId: z.string().trim().max(40).nullable().default(null),
  comment: z.string().trim().max(500).default(""),
  plusOneName: z.string().trim().max(120).default(""),
  // Блюдо спутника: без него он попадал в сводку для кухни как
  // «не выбрано», и повару приходилось звонить и уточнять.
  plusOneMealOptionId: z.string().trim().max(40).nullable().default(null),
  // Напитки — флажками, поэтому списком: бокал вина и шампанское на тост.
  drinkOptionIds: z.array(z.string().trim().max(40)).max(30).default([]),
  plusOneDrinkOptionIds: z.array(z.string().trim().max(40)).max(30).default([]),
  /**
   * «Какую музыку предпочитаете?». `undefined` — формы, где этого вопроса
   * нет: там прежний ответ не трогаем, а не стираем молча.
   */
  musicWish: z.string().trim().max(200).optional(),
  /**
   * Ответы на поля конструктора анкеты: id вопроса → значения. `undefined`
   * — форма без этих полей: прежние ответы не трогаем.
   */
  answers: z.record(z.string().max(60), z.array(z.string().max(1000)).max(40)).optional(),
});

export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export type RsvpResult =
  | { ok: true; status: "PENDING" | "ACCEPTED" | "DECLINED"; plusOneName: string | null }
  | { ok: false; reason: "gone" | "deadline" | "invalid"; message: string };

/**
 * @param linkToken токен именной ссылки — он же удостоверяет личность гостя.
 */
export async function submitRsvp(
  linkToken: string,
  raw: unknown,
  /** Поля анкеты, если вызывающий их уже загрузил. */
  preloaded?: RsvpQuestion[],
): Promise<RsvpResult> {
  const parsed = rsvpInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: "Проверьте заполнение формы" };
  }
  const input = parsed.data;

  const guest = await db.guest.findUnique({
    where: { linkToken },
    select: {
      id: true, orgId: true, eventId: true, archivedAt: true, displayName: true,
      plusOneAllowed: true, parentGuestId: true, rsvpAnswers: true, mealOptionId: true,
      drinks: { select: { drinkOptionId: true } },
      // Нынешний выбор спутника — чтобы его прежнее блюдо тоже можно было сохранить.
      plusOnes: {
        where: { archivedAt: null }, orderBy: { createdAt: "asc" }, take: 1,
        select: { mealOptionId: true, drinks: { select: { drinkOptionId: true } } },
      },
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
  // Прежний выбор гостя принимается и тогда, когда блюдо уже выключено:
  // иначе анкета, которая возвращает его скрытым полем, навсегда застревала
  // на «такого блюда нет в меню».
  const pickMeal = async (id: string | null, kept: string | null): Promise<string | null | "invalid"> => {
    if (input.status !== "ACCEPTED" || !id) return null;
    if (id === kept) return id;
    const meal = await db.mealOption.findFirst({
      where: { id, eventId: guest.eventId, active: true },
      select: { id: true },
    });
    return meal ? meal.id : "invalid";
  };

  const plusOneNow = guest.plusOnes[0] ?? null;
  const mealOptionId = await pickMeal(input.mealOptionId, guest.mealOptionId);
  if (mealOptionId === "invalid") {
    return { ok: false, reason: "invalid", message: "Такого блюда нет в меню" };
  }

  const plusOneMealOptionId = await pickMeal(input.plusOneMealOptionId, plusOneNow?.mealOptionId ?? null);
  if (plusOneMealOptionId === "invalid") {
    return { ok: false, reason: "invalid", message: "Такого блюда нет в меню" };
  }

  // Напитки проверяются так же, как блюдо: только включённые и только своего бара.
  // Уже выбранные гостем напитки, как и блюдо, проходят и после выключения.
  const pickDrinks = async (ids: string[], kept: string[]): Promise<string[] | "invalid"> => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (input.status !== "ACCEPTED" || unique.length === 0) return [];
    const fresh = unique.filter((id) => !kept.includes(id));
    if (fresh.length === 0) return unique;
    const found = await db.drinkOption.findMany({
      where: { id: { in: fresh }, eventId: guest.eventId, active: true },
      select: { id: true },
    });
    return found.length === fresh.length ? unique : "invalid";
  };

  const drinkOptionIds = await pickDrinks(input.drinkOptionIds, guest.drinks.map((row) => row.drinkOptionId));
  const plusOneDrinkOptionIds = await pickDrinks(
    input.plusOneDrinkOptionIds,
    plusOneNow?.drinks.map((row) => row.drinkOptionId) ?? [],
  );
  if (drinkOptionIds === "invalid" || plusOneDrinkOptionIds === "invalid") {
    return { ok: false, reason: "invalid", message: "Такого напитка нет в баре" };
  }

  // Поля конструктора анкеты. Обязательность — только для тех, кто придёт.
  const questions = preloaded ?? (await effectiveRsvpQuestions(guest.eventId));
  let rsvpAnswers: ReturnType<typeof parseStoredAnswers> | undefined;
  if (input.answers !== undefined) {
    const checked = checkAnswers(questions, input.answers, input.status, parseStoredAnswers(guest.rsvpAnswers));
    if (!checked.ok) return { ok: false, reason: "invalid", message: checked.message };
    rsvpAnswers = checked.answers;
  }
  if (input.status === "ACCEPTED") {
    const needMeal = questions.some((question) => question.type === "MEAL" && question.required);
    const needDrinks = questions.some((question) => question.type === "DRINKS" && question.required);
    const needMusic = questions.some((question) => question.type === "MUSIC" && question.required);
    if (needMusic && input.musicWish !== undefined && !input.musicWish.trim()) {
      return { ok: false, reason: "invalid", message: "Предложите песню для диджея" };
    }
    if (needMeal && !mealOptionId && (await db.mealOption.count({ where: { eventId: guest.eventId, active: true } })) > 0) {
      return { ok: false, reason: "invalid", message: "Выберите блюдо" };
    }
    if (needDrinks && drinkOptionIds.length === 0 && (await db.drinkOption.count({ where: { eventId: guest.eventId, active: true } })) > 0) {
      return { ok: false, reason: "invalid", message: "Отметьте, что будете пить" };
    }
  }

  // Спутника приводит только приглашённый и только с разрешения обеих сторон.
  // Спутник спутника не приводит — иначе список гостей растёт цепочкой.
  const plusOneAllowed =
    guest.event.allowPlusOne && guest.plusOneAllowed && guest.parentGuestId === null;
  const plusOneName =
    input.status === "ACCEPTED" && plusOneAllowed ? input.plusOneName.trim() : "";

  await db.$transaction(async (tx) => {
    // Выбор напитков переписывается целиком: так снятый флажок тоже сохраняется.
    const setDrinks = async (guestId: string, ids: string[]) => {
      await tx.guestDrink.deleteMany({ where: { eventId: guest.eventId, guestId } });
      if (ids.length === 0) return;
      await tx.guestDrink.createMany({
        data: ids.map((drinkOptionId) => ({
          orgId: guest.orgId, eventId: guest.eventId, guestId, drinkOptionId,
        })),
      });
    };

    // Гость поправил своё имя — переписываем и ключ поиска с алиасами,
    // иначе на входе по QR он найдётся только под прежним написанием.
    const rename = input.guestName && input.guestName !== guest.displayName ? input.guestName : null;
    if (rename) {
      await tx.guestAlias.deleteMany({ where: { eventId: guest.eventId, guestId: guest.id } });
    }

    await tx.guest.update({
      where: { eventId_id: { eventId: guest.eventId, id: guest.id } },
      data: {
        ...(rename ? {
          displayName: rename,
          searchKey: normalizeName(rename),
          aliases: { create: expandGuestName(rename).map((alias) => ({ orgId: guest.orgId, alias })) },
        } : {}),
        rsvpStatus: input.status,
        rsvpAt: input.status === "PENDING" ? null : new Date(),
        mealOptionId,
        comment: input.comment || null,
        plusOneName: plusOneName || null,
        ...(input.musicWish !== undefined ? { musicWish: input.musicWish || null } : {}),
        ...(rsvpAnswers !== undefined ? { rsvpAnswers } : {}),
      },
    });
    await setDrinks(guest.id, drinkOptionIds);

    const existing = await tx.guest.findFirst({
      where: { eventId: guest.eventId, parentGuestId: guest.id, archivedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, displayName: true },
    });

    if (plusOneName) {
      if (existing) {
        // Блюдо спутника может поменяться и без переименования.
        await tx.guest.update({
          where: { eventId_id: { eventId: guest.eventId, id: existing.id } },
          data: { mealOptionId: plusOneMealOptionId },
        });
        await setDrinks(existing.id, plusOneDrinkOptionIds);

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
              mealOptionId: plusOneMealOptionId,
              aliases: {
                create: expandGuestName(plusOneName).map((alias) => ({ orgId: guest.orgId, alias })),
              },
            },
          });
        }
      } else {
        const created = await tx.guest.create({
          data: {
            orgId: guest.orgId,
            eventId: guest.eventId,
            displayName: plusOneName,
            searchKey: normalizeName(plusOneName),
            parentGuestId: guest.id,
            rsvpStatus: "ACCEPTED",
            rsvpAt: new Date(),
            mealOptionId: plusOneMealOptionId,
            linkToken: generateLinkToken(),
            note: "Спутник (+1)",
            aliases: {
              create: expandGuestName(plusOneName).map((alias) => ({ orgId: guest.orgId, alias })),
            },
          },
          select: { id: true },
        });
        await setDrinks(created.id, plusOneDrinkOptionIds);
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
  const [byStatus, meals, drinks, plusOnes, notOpened] = await Promise.all([
    db.guest.groupBy({
      by: ["rsvpStatus"],
      where: { eventId, archivedAt: null, ...ONLY_GUESTS },
      _count: { _all: true },
    }),
    db.guest.groupBy({
      by: ["mealOptionId"],
      where: { eventId, archivedAt: null, ...ONLY_GUESTS, rsvpStatus: "ACCEPTED" },
      _count: { _all: true },
    }),
    // Для бара считаются только те, кто придёт: отказавшийся гость
    // мог выбрать вино ещё до того, как передумал.
    db.guestDrink.groupBy({
      by: ["drinkOptionId"],
      where: { eventId, guest: { archivedAt: null, ...ONLY_GUESTS, rsvpStatus: "ACCEPTED" } },
      _count: { _all: true },
    }),
    db.guest.count({ where: { eventId, archivedAt: null, ...ONLY_GUESTS, parentGuestId: { not: null } } }),
    db.guest.count({ where: { eventId, archivedAt: null, ...ONLY_GUESTS, linkOpenedAt: null } }),
  ]);

  const count = (status: string) =>
    byStatus.find((row) => row.rsvpStatus === status)?._count._all ?? 0;

  const [options, drinkOptions] = await Promise.all([
    db.mealOption.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
    db.drinkOption.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
  ]);

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
    drinks: drinkOptions.map((option) => ({
      id: option.id,
      title: option.title,
      count: drinks.find((row) => row.drinkOptionId === option.id)?._count._all ?? 0,
    })),
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
    where: { eventId, archivedAt: null, ...ONLY_GUESTS },
    orderBy: [{ rsvpStatus: "asc" }, { searchKey: "asc" }],
    select: {
      id: true, displayName: true, rsvpStatus: true, rsvpAt: true,
      comment: true, linkToken: true, linkOpenedAt: true,
      parentGuestId: true, plusOneName: true, musicWish: true, rsvpAnswers: true,
      mealOption: { select: { title: true } },
      drinks: {
        select: { drink: { select: { title: true } } },
        orderBy: { drink: { order: "asc" } },
      },
      parentGuest: { select: { displayName: true } },
    },
  });
}
