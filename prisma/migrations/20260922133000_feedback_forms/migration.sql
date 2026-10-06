CREATE TYPE "FeedbackFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

CREATE TYPE "FeedbackQuestionType" AS ENUM (
  'SHORT_TEXT',
  'LONG_TEXT',
  'EMAIL',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'DROPDOWN',
  'RATING',
  'DATE'
);

CREATE TABLE "feedback_forms" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "thankYouText" TEXT NOT NULL DEFAULT 'Спасибо! Ваш ответ сохранён.',
  "status" "FeedbackFormStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feedback_forms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback_questions" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "type" "FeedbackQuestionType" NOT NULL DEFAULT 'SHORT_TEXT',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" JSONB NOT NULL DEFAULT '[]',
  "order" INTEGER NOT NULL,
  CONSTRAINT "feedback_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback_responses" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "answers" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feedback_forms_publicId_key" ON "feedback_forms"("publicId");
CREATE UNIQUE INDEX "feedback_forms_eventId_id_key" ON "feedback_forms"("eventId", "id");
CREATE INDEX "feedback_forms_eventId_status_idx" ON "feedback_forms"("eventId", "status");
CREATE UNIQUE INDEX "feedback_questions_eventId_id_key" ON "feedback_questions"("eventId", "id");
CREATE UNIQUE INDEX "feedback_questions_formId_order_key" ON "feedback_questions"("formId", "order");
CREATE INDEX "feedback_questions_eventId_formId_idx" ON "feedback_questions"("eventId", "formId");
CREATE INDEX "feedback_responses_eventId_formId_createdAt_idx" ON "feedback_responses"("eventId", "formId", "createdAt");

ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_orgId_eventId_fkey"
  FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_questions" ADD CONSTRAINT "feedback_questions_eventId_formId_fkey"
  FOREIGN KEY ("eventId", "formId") REFERENCES "feedback_forms"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_eventId_formId_fkey"
  FOREIGN KEY ("eventId", "formId") REFERENCES "feedback_forms"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
