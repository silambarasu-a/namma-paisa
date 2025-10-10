-- AlterTable: Increase decimal precision for Holdings table to support crypto with high decimal places
ALTER TABLE "holdings" ALTER COLUMN "qty" TYPE DECIMAL(20,10);
ALTER TABLE "holdings" ALTER COLUMN "avgCost" TYPE DECIMAL(18,10);
ALTER TABLE "holdings" ALTER COLUMN "currentPrice" TYPE DECIMAL(18,10);

-- AlterTable: Increase decimal precision for Transactions table
ALTER TABLE "transactions" ALTER COLUMN "qty" TYPE DECIMAL(20,10);
ALTER TABLE "transactions" ALTER COLUMN "price" TYPE DECIMAL(18,10);
ALTER TABLE "transactions" ALTER COLUMN "amount" TYPE DECIMAL(18,10);
ALTER TABLE "transactions" ALTER COLUMN "amountInr" TYPE DECIMAL(18,10);

-- AlterTable: Increase decimal precision for SIPExecution table
ALTER TABLE "sip_executions" ALTER COLUMN "amount" TYPE DECIMAL(18,10);
ALTER TABLE "sip_executions" ALTER COLUMN "amountInr" TYPE DECIMAL(18,10);
ALTER TABLE "sip_executions" ALTER COLUMN "qty" TYPE DECIMAL(20,10);
ALTER TABLE "sip_executions" ALTER COLUMN "price" TYPE DECIMAL(18,10);
