-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."SIPFrequency" ADD VALUE 'DAILY';
ALTER TYPE "public"."SIPFrequency" ADD VALUE 'WEEKLY';
ALTER TYPE "public"."SIPFrequency" ADD VALUE 'QUARTERLY';
ALTER TYPE "public"."SIPFrequency" ADD VALUE 'HALF_YEARLY';

-- AlterTable
ALTER TABLE "public"."sip_executions" ADD COLUMN     "usdInrRate" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "public"."sips" ADD COLUMN     "amountInINR" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';
