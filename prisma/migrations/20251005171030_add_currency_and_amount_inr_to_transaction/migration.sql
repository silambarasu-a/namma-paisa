-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "amountInr" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';
