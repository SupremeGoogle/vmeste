-- AlterTable
ALTER TABLE "events" ALTER COLUMN "guestLinkSecret" SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- AlterTable
ALTER TABLE "gifts" ADD COLUMN     "imageUrl" TEXT NOT NULL DEFAULT '';
