-- Видео с лицами пары: каталог мастер-роликов, фото лиц и задачи генерации.
CREATE TYPE "FaceRole" AS ENUM ('BRIDE', 'GROOM');
CREATE TYPE "FaceVideoStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

CREATE TABLE "video_templates" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "previewKey" TEXT,
  "posterKey" TEXT,
  "durationSec" DOUBLE PRECISION NOT NULL,
  "faceSlots" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "face_photos" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "role" "FaceRole" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "face_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "face_video_jobs" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "status" "FaceVideoStatus" NOT NULL DEFAULT 'QUEUED',
  "bridePhotoIds" TEXT[],
  "groomPhotoIds" TEXT[],
  "provider" TEXT NOT NULL,
  "providerJobId" TEXT,
  "resultKey" TEXT,
  "error" TEXT,
  "gpuSeconds" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "face_video_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "video_templates_slug_key" ON "video_templates"("slug");
CREATE UNIQUE INDEX "face_photos_eventId_id_key" ON "face_photos"("eventId", "id");
CREATE INDEX "face_photos_eventId_role_idx" ON "face_photos"("eventId", "role");
CREATE UNIQUE INDEX "face_video_jobs_eventId_id_key" ON "face_video_jobs"("eventId", "id");
CREATE INDEX "face_video_jobs_eventId_createdAt_idx" ON "face_video_jobs"("eventId", "createdAt");
CREATE INDEX "face_video_jobs_status_idx" ON "face_video_jobs"("status");

ALTER TABLE "face_photos" ADD CONSTRAINT "face_photos_orgId_eventId_fkey"
  FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "face_video_jobs" ADD CONSTRAINT "face_video_jobs_orgId_eventId_fkey"
  FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "face_video_jobs" ADD CONSTRAINT "face_video_jobs_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "video_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
