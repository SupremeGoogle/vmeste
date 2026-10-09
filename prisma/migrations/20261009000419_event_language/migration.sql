-- Язык гостевой части мероприятия (ru | en).
ALTER TABLE "events" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ru';
