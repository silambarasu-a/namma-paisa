-- AlterTable
ALTER TABLE "public"."holdings" ADD COLUMN     "usdInrRate" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "usdInrRate" DECIMAL(10,4);
