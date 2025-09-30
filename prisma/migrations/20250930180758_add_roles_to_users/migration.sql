/*
  Warnings:

  - The `paymentMethod` column on the `expenses` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'NET_BANKING', 'OTHER');

-- AlterTable
ALTER TABLE "public"."expenses" ADD COLUMN     "creditCardId" TEXT,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "public"."sips" ADD COLUMN     "bucket" "public"."InvestBucket",
ADD COLUMN     "symbol" TEXT;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "role",
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recentlyAccessedAt" TIMESTAMP(3),
ADD COLUMN     "roles" "public"."Role"[] DEFAULT ARRAY['CUSTOMER']::"public"."Role"[];

-- CreateTable
CREATE TABLE "public"."incomes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expectedPercent" DECIMAL(5,2),
    "expectedAmount" DECIMAL(12,2),
    "unexpectedPercent" DECIMAL(5,2),
    "unexpectedAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "lastFourDigits" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "billingCycle" INTEGER NOT NULL,
    "cardNetwork" TEXT,
    "cardLimit" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."monthly_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "afterTax" DECIMAL(12,2) NOT NULL,
    "totalLoans" DECIMAL(12,2) NOT NULL,
    "totalSIPs" DECIMAL(12,2) NOT NULL,
    "totalExpenses" DECIMAL(12,2) NOT NULL,
    "expectedExpenses" DECIMAL(12,2) NOT NULL,
    "unexpectedExpenses" DECIMAL(12,2) NOT NULL,
    "needsExpenses" DECIMAL(12,2) NOT NULL,
    "avoidExpenses" DECIMAL(12,2) NOT NULL,
    "availableAmount" DECIMAL(12,2) NOT NULL,
    "spentAmount" DECIMAL(12,2) NOT NULL,
    "surplusAmount" DECIMAL(12,2) NOT NULL,
    "previousSurplus" DECIMAL(12,2) NOT NULL,
    "investmentsMade" DECIMAL(12,2),
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_budgets_userId_key" ON "public"."expense_budgets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_snapshots_userId_year_month_key" ON "public"."monthly_snapshots"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "public"."incomes" ADD CONSTRAINT "incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_budgets" ADD CONSTRAINT "expense_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_cards" ADD CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "public"."credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."monthly_snapshots" ADD CONSTRAINT "monthly_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
