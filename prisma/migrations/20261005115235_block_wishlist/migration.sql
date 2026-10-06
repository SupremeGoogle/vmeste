-- AlterEnum
ALTER TYPE "BlockType" ADD VALUE 'WISHLIST';

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "guestLinkSecret" SET DEFAULT encode(gen_random_bytes(32), 'hex');
