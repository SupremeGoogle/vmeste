-- CreateEnum
CREATE TYPE "ScreenMode" AS ENUM ('PHOTOS', 'WISHES', 'MIXED', 'RAFFLE', 'IDLE');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "screenMode" "ScreenMode" NOT NULL DEFAULT 'MIXED',
ALTER COLUMN "guestLinkSecret" SET DEFAULT encode(gen_random_bytes(32), 'hex');
