import { prisma } from "@/lib/prisma"

/**
 * Calculate the current value and profit/loss for a borrowed fund
 * based on the linked holding's current price
 */
export async function calculateBorrowedFundProfitLoss(borrowedFundId: string) {
  const fund = await prisma.borrowedFund.findUnique({
    where: { id: borrowedFundId },
    include: {
      investedInHolding: true,
    },
  })

  if (!fund) {
    throw new Error("Borrowed fund not found")
  }

  // If no holding is linked, return zeros
  if (!fund.investedInHoldingId || !fund.investedInHolding) {
    return {
      currentValue: 0,
      profitLoss: 0,
      profitLossPercent: 0,
    }
  }

  const holding = fund.investedInHolding
  const borrowedAmount = Number(fund.borrowedAmount)

  // If no current price, can't calculate profit/loss
  if (!holding.currentPrice) {
    return {
      currentValue: borrowedAmount,
      profitLoss: 0,
      profitLossPercent: 0,
    }
  }

  // Calculate how many units were bought with the borrowed amount
  const avgCost = Number(holding.avgCost)
  const currentPrice = Number(holding.currentPrice)
  const unitsFromBorrowedFund = borrowedAmount / avgCost

  // Calculate current value and profit/loss
  const currentValue = unitsFromBorrowedFund * currentPrice
  const profitLoss = currentValue - borrowedAmount
  const profitLossPercent = (profitLoss / borrowedAmount) * 100

  return {
    currentValue: Number(currentValue.toFixed(2)),
    profitLoss: Number(profitLoss.toFixed(2)),
    profitLossPercent: Number(profitLossPercent.toFixed(2)),
  }
}

/**
 * Update the borrowed fund with calculated profit/loss
 */
export async function updateBorrowedFundProfitLoss(borrowedFundId: string) {
  const { currentValue, profitLoss } = await calculateBorrowedFundProfitLoss(
    borrowedFundId
  )

  return prisma.borrowedFund.update({
    where: { id: borrowedFundId },
    data: {
      currentValue,
      profitLoss,
    },
  })
}

/**
 * Batch update profit/loss for all borrowed funds with holdings
 */
export async function updateAllBorrowedFundsProfitLoss(userId: string) {
  const funds = await prisma.borrowedFund.findMany({
    where: {
      userId,
      investedInHoldingId: { not: null },
      isFullyReturned: false,
    },
  })

  const updates = await Promise.all(
    funds.map(async (fund) => {
      try {
        const { currentValue, profitLoss } =
          await calculateBorrowedFundProfitLoss(fund.id)
        return prisma.borrowedFund.update({
          where: { id: fund.id },
          data: { currentValue, profitLoss },
        })
      } catch (error) {
        console.error(
          `Error updating borrowed fund ${fund.id}:`,
          error
        )
        return null
      }
    })
  )

  return updates.filter((update) => update !== null)
}

/**
 * Calculate borrowed funds summary for a specific month
 */
export async function calculateBorrowedFundsSummary(
  userId: string,
  month: number,
  year: number
) {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  // Get funds received this month
  const fundsReceived = await prisma.borrowedFund.findMany({
    where: {
      userId,
      borrowedDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  })

  const totalReceived = fundsReceived.reduce(
    (sum, fund) => sum + Number(fund.borrowedAmount),
    0
  )

  // Get all active funds (including ones from previous months)
  const activeFunds = await prisma.borrowedFund.findMany({
    where: {
      userId,
      borrowedDate: { lte: monthEnd },
      OR: [
        { isFullyReturned: false },
        {
          actualReturnDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      ],
    },
    include: {
      investedInHolding: {
        select: {
          symbol: true,
          name: true,
        },
      },
    },
  })

  // Calculate returns made this month
  const totalReturned = activeFunds.reduce((sum, fund) => {
    // If returned in this month, count the returned amount
    if (
      fund.actualReturnDate &&
      fund.actualReturnDate >= monthStart &&
      fund.actualReturnDate <= monthEnd
    ) {
      return sum + Number(fund.returnedAmount)
    }
    return sum
  }, 0)

  // Calculate total profit/loss
  const totalProfit = activeFunds.reduce(
    (sum, fund) => sum + (Number(fund.profitLoss) || 0),
    0
  )

  // Build fund details array
  const fundsData = activeFunds.map((fund) => ({
    fundId: fund.id,
    lenderName: fund.lenderName,
    borrowedAmount: Number(fund.borrowedAmount),
    returnedAmount: Number(fund.returnedAmount),
    currentValue: fund.currentValue ? Number(fund.currentValue) : null,
    profitLoss: fund.profitLoss ? Number(fund.profitLoss) : null,
    investedIn: fund.investedInHolding
      ? `${fund.investedInHolding.symbol} - ${fund.investedInHolding.name}`
      : null,
    isFullyReturned: fund.isFullyReturned,
  }))

  return {
    borrowedFundsReceived: totalReceived,
    borrowedFundsReturned: totalReturned,
    borrowedFundsCount: activeFunds.filter((f) => !f.isFullyReturned).length,
    borrowedFundsProfit: totalProfit,
    borrowedFundsData: fundsData,
  }
}
