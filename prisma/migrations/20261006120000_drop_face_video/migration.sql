-- Генерация видео с лицами пары убрана из продукта (вместо неё — связь в Telegram).

-- DropForeignKey
ALTER TABLE "face_photos" DROP CONSTRAINT "face_photos_orgId_eventId_fkey";

-- DropForeignKey
ALTER TABLE "face_video_jobs" DROP CONSTRAINT "face_video_jobs_orgId_eventId_fkey";

-- DropForeignKey
ALTER TABLE "face_video_jobs" DROP CONSTRAINT "face_video_jobs_templateId_fkey";

-- DropTable
DROP TABLE "face_photos";

-- DropTable
DROP TABLE "face_video_jobs";

-- DropTable
DROP TABLE "video_templates";

-- DropEnum
DROP TYPE "FaceRole";

-- DropEnum
DROP TYPE "FaceVideoStatus";
