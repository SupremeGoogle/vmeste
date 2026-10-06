-- Меню и бар в анкете — по одному на мероприятие. Проверка в коде
-- (сначала посчитать, потом создать) не спасает от двух одновременных
-- первых открытий конструктора: держит база.

-- Если дубли уже успели появиться — оставляем первый по порядку.
DELETE FROM "rsvp_questions" a
  USING "rsvp_questions" b
 WHERE a."eventId" = b."eventId"
   AND a."type" = b."type"
   AND a."type" IN ('MEAL', 'DRINKS')
   AND (a."order", a."id") > (b."order", b."id");

CREATE UNIQUE INDEX "rsvp_questions_eventId_singleton_key"
  ON "rsvp_questions"("eventId", "type")
  WHERE "type" IN ('MEAL', 'DRINKS');
