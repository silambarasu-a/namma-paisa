-- AlterTable
ALTER TABLE "public"."sip_executions" ADD COLUMN     "amountInr" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';
