-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('ADMIN', 'SUPPORT');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "adminUntil" TIMESTAMP(3),
ADD COLUMN     "impersonatorId" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "platformRole" "PlatformRole";

-- CreateTable
CREATE TABLE "admin_secrets" (
    "userId" TEXT NOT NULL,
    "totpSecret" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "lastStep" INTEGER NOT NULL DEFAULT 0,
    "backupCodes" TEXT[],
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_secrets_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "admin_audit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_createdAt_idx" ON "admin_audit"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_targetType_targetId_idx" ON "admin_audit"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "admin_secrets" ADD CONSTRAINT "admin_secrets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

