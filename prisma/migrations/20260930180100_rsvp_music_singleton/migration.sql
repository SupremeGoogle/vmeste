-- Вопрос о песне — тоже один на анкету, как меню и бар. Отдельной
-- миграцией: новое значение enum нельзя использовать в той же транзакции,
-- в которой его добавили.
DROP INDEX "rsvp_questions_eventId_singleton_key";

CREATE UNIQUE INDEX "rsvp_questions_eventId_singleton_key"
  ON "rsvp_questions"("eventId", "type")
  WHERE "type" IN ('MEAL', 'DRINKS', 'MUSIC');
