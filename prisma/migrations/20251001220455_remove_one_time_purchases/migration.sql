/*
  Warnings:

  - You are about to drop the `one_time_purchases` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."one_time_purchases" DROP CONSTRAINT "one_time_purchases_userId_fkey";

-- DropTable
DROP TABLE "public"."one_time_purchases";
