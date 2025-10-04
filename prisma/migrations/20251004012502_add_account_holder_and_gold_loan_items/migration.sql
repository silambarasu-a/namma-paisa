-- AlterTable
ALTER TABLE "public"."loans" ADD COLUMN     "accountHolderName" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "public"."gold_loan_items" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "carat" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "grossWeight" DECIMAL(10,3) NOT NULL,
    "netWeight" DECIMAL(10,3) NOT NULL,
    "loanAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gold_loan_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."gold_loan_items" ADD CONSTRAINT "gold_loan_items_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
