-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('ONE_TIME_PURCHASE', 'SIP_EXECUTION', 'MANUAL_ENTRY', 'MANUAL_EDIT');

-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "public"."holdings" ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holdingId" TEXT,
    "bucket" "public"."InvestBucket" NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" DECIMAL(18,6) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionType" "public"."TransactionType" NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sip_executions" (
    "id" TEXT NOT NULL,
    "sipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holdingId" TEXT,
    "executionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "qty" DECIMAL(18,6),
    "price" DECIMAL(12,2),
    "status" "public"."ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sip_executions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "public"."holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sip_executions" ADD CONSTRAINT "sip_executions_sipId_fkey" FOREIGN KEY ("sipId") REFERENCES "public"."sips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sip_executions" ADD CONSTRAINT "sip_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sip_executions" ADD CONSTRAINT "sip_executions_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "public"."holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
