-- AlterTable
ALTER TABLE "public"."borrowed_funds" ADD COLUMN     "investedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "surplusAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
