-- CreateEnum
CREATE TYPE "public"."MemberCategory" AS ENUM ('FAMILY', 'FRIEND', 'RELATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MemberTransactionType" AS ENUM ('GAVE', 'OWE', 'EXPENSE_PAID_FOR_THEM', 'EXPENSE_PAID_BY_THEM');

-- AlterTable
ALTER TABLE "public"."expenses" ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "paidByMember" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidForMember" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."MemberCategory" NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."member_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "transactionType" "public"."MemberTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "paymentMethod" "public"."PaymentMethod",
    "receiptUrl" TEXT,
    "expenseId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledDate" TIMESTAMP(3),
    "settledNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_name_key" ON "public"."members"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "member_transactions_expenseId_key" ON "public"."member_transactions"("expenseId");

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_transactions" ADD CONSTRAINT "member_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_transactions" ADD CONSTRAINT "member_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_transactions" ADD CONSTRAINT "member_transactions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
