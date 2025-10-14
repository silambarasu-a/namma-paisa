/*
  Warnings:

  - A unique constraint covering the columns `[settlementIncomeId]` on the table `member_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settlementExpenseId]` on the table `member_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."member_transactions" ADD COLUMN     "settledAmount" DECIMAL(12,2),
ADD COLUMN     "settlementExpenseId" TEXT,
ADD COLUMN     "settlementIncomeId" TEXT;

-- AlterTable
ALTER TABLE "public"."members" ADD COLUMN     "extraOwe" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "extraSpent" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."monthly_snapshots" ADD COLUMN     "memberBorrowed" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "memberLent" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "memberTransactionsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "memberTransactionsData" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "member_transactions_settlementIncomeId_key" ON "public"."member_transactions"("settlementIncomeId");

-- CreateIndex
CREATE UNIQUE INDEX "member_transactions_settlementExpenseId_key" ON "public"."member_transactions"("settlementExpenseId");

-- AddForeignKey
ALTER TABLE "public"."member_transactions" ADD CONSTRAINT "member_transactions_settlementIncomeId_fkey" FOREIGN KEY ("settlementIncomeId") REFERENCES "public"."incomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_transactions" ADD CONSTRAINT "member_transactions_settlementExpenseId_fkey" FOREIGN KEY ("settlementExpenseId") REFERENCES "public"."expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
