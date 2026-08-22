-- CreateEnum
CREATE TYPE "GuestRole" AS ENUM ('GUEST', 'BRIDE', 'GROOM');

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "guestLinkSecret" SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "role" "GuestRole" NOT NULL DEFAULT 'GUEST';
