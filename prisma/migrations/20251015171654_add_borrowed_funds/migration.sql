-- CreateTable
CREATE TABLE "borrowed_funds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "lenderName" TEXT NOT NULL,
    "borrowedAmount" DECIMAL(12,2) NOT NULL,
    "borrowedDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "returnedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isFullyReturned" BOOLEAN NOT NULL DEFAULT false,
    "investedInHoldingId" TEXT,
    "transactionIds" TEXT[],
    "sipExecutionIds" TEXT[],
    "currentValue" DECIMAL(12,2),
    "profitLoss" DECIMAL(12,2),
    "purpose" TEXT,
    "terms" TEXT,
    "interestRate" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowed_funds_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "borrowed_funds" ADD CONSTRAINT "borrowed_funds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowed_funds" ADD CONSTRAINT "borrowed_funds_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowed_funds" ADD CONSTRAINT "borrowed_funds_investedInHoldingId_fkey" FOREIGN KEY ("investedInHoldingId") REFERENCES "holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
