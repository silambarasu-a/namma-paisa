-- CreateEnum
CREATE TYPE "public"."EMIFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY', 'CUSTOM');

-- AlterTable
ALTER TABLE "public"."emis" ADD COLUMN     "paidAmount" DECIMAL(12,2),
ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "paymentNotes" TEXT;

-- AlterTable
ALTER TABLE "public"."loans" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "customPaymentDay" INTEGER,
ADD COLUMN     "emiFrequency" "public"."EMIFrequency" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "isClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;
