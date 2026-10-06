-- Конструктор анкеты RSVP в приглашении: свои поля «как в Google Формах».

-- CreateEnum
CREATE TYPE "RsvpQuestionType" AS ENUM (
  'SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RATING', 'DATE', 'MEAL', 'DRINKS'
);

-- AlterTable
ALTER TABLE "guests" ADD COLUMN "rsvpAnswers" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "rsvp_questions" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" "RsvpQuestionType" NOT NULL DEFAULT 'SHORT_TEXT',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" JSONB NOT NULL DEFAULT '[]',
  "order" INTEGER NOT NULL,
  CONSTRAINT "rsvp_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rsvp_questions_eventId_id_key" ON "rsvp_questions"("eventId", "id");
CREATE INDEX "rsvp_questions_eventId_order_idx" ON "rsvp_questions"("eventId", "order");

-- AddForeignKey
ALTER TABLE "rsvp_questions" ADD CONSTRAINT "rsvp_questions_orgId_eventId_fkey"
  FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
