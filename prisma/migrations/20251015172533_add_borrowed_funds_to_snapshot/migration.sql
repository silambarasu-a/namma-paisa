-- AlterTable
ALTER TABLE "public"."monthly_snapshots" ADD COLUMN     "borrowedFundsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "borrowedFundsData" JSONB,
ADD COLUMN     "borrowedFundsProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "borrowedFundsReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "borrowedFundsReturned" DECIMAL(12,2) NOT NULL DEFAULT 0;
