import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateFinancialSummary } from "@/lib/budget-utils"
import { getAmountForMonth } from "@/lib/frequency-utils"
import { calculateBorrowedFundsSummary } from "@/lib/borrowed-funds-calculator"

// Get current month snapshot - returns saved snapshot or calculates preview
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get("month")
    const yearParam = searchParams.get("year")

    const now = new Date()
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1
    const year = yearParam ? parseInt(yearParam) : now.getFullYear()

    // Check if snapshot exists
    const snapshot = await prisma.monthlySnapshot.findUnique({
      where: {
        userId_year_month: {
          userId: session.user.id,
          year,
          month,
        },
      },
    })

    if (snapshot) {
      // Return saved snapshot
      return NextResponse.json(snapshot)
    }

    // Calculate preview data (not saved)
    const data = await calculateMonthlyData(session.user.id, year, month)

    return NextResponse.json({
      month,
      year,
      ...data,
      isClosed: false,
      closedAt: null,
    })
  } catch (error) {
    console.error("Error fetching monthly snapshot:", error)
    return NextResponse.json(
      { error: "Failed to fetch monthly snapshot" },
      { status: 500 }
    )
  }
}

// Close current month and create snapshot (or force recalculate existing)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { month, year, forceRecalculate } = body

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      )
    }

    // Check if already closed
    const existing = await prisma.monthlySnapshot.findUnique({
      where: {
        userId_year_month: {
          userId: session.user.id,
          year,
          month,
        },
      },
    })

    if (existing?.isClosed && !forceRecalculate) {
      return NextResponse.json(
        { error: "Month already closed. Use forceRecalculate to update." },
        { status: 400 }
      )
    }

    // Calculate month data
    const data = await calculateMonthlyData(session.user.id, year, month)

    // Create or update snapshot
    const snapshot = await prisma.monthlySnapshot.upsert({
      where: {
        userId_year_month: {
          userId: session.user.id,
          year,
          month,
        },
      },
      create: {
        userId: session.user.id,
        month,
        year,
        ...data,
        isClosed: true,
        closedAt: new Date(),
      },
      update: {
        ...data,
        isClosed: true,
        closedAt: new Date(),
      },
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error("Error closing monthly snapshot:", error)
    return NextResponse.json(
      { error: "Failed to close monthly snapshot" },
      { status: 500 }
    )
  }
}

async function calculateMonthlyData(userId: string, year: number, month: number) {
  // Get date range for the month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1) // First day of next month (exclusive)

  // Get salary that was effective during the selected month
  const latestSalary = await prisma.salaryHistory.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: endDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: startDate } }
      ]
    },
    orderBy: { effectiveFrom: "desc" },
  })
  const monthlySalary = latestSalary ? Number(latestSalary.monthly) : 0

  // Get additional income for this month
  const additionalIncomes = await prisma.income.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
  })

  const additionalIncome = additionalIncomes.reduce((sum, income) => sum + Number(income.amount), 0)
  const salary = monthlySalary + additionalIncome

  // Get tax
  const taxSetting = await prisma.taxSetting.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })

  let taxAmount = 0
  if (taxSetting && salary > 0) {
    switch (taxSetting.mode) {
      case "PERCENTAGE":
        taxAmount = taxSetting.percentage ? (salary * Number(taxSetting.percentage)) / 100 : 0
        break
      case "FIXED":
        taxAmount = taxSetting.fixedAmount ? Number(taxSetting.fixedAmount) : 0
        break
      case "HYBRID":
        const percentAmount = taxSetting.percentage ? (salary * Number(taxSetting.percentage)) / 100 : 0
        const fixedAmount = taxSetting.fixedAmount ? Number(taxSetting.fixedAmount) : 0
        taxAmount = percentAmount + fixedAmount
        break
    }
  }

  const afterTax = salary - taxAmount

  // Get loans for this month with EMI details
  const loans = await prisma.loan.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lt: endDate },
      OR: [
        { endDate: null },
        { endDate: { gte: startDate } }
      ]
    },
    include: {
      emis: {
        where: {
          dueDate: {
            gte: startDate,
            lt: endDate
          }
        }
      }
    }
  })

  // Calculate total loans - only count EMIs that are actually due this month
  const totalLoans = loans.reduce((sum, loan) => {
    const emi = loan.emis[0] // Get the EMI for this month
    // Only count if there's an EMI due this month
    return emi ? sum + Number(emi.emiAmount) : sum
  }, 0)

  // Build loan tracking data - only include loans with EMIs due this month
  const loansData = loans
    .filter(loan => loan.emis.length > 0) // Only include loans with EMIs due this month
    .map(loan => {
      const emi = loan.emis[0] // Get the EMI for this month
      return {
        loanId: loan.id,
        loanType: loan.loanType,
        institution: loan.institution,
        emiAmount: Number(emi.emiAmount),
        isPaid: emi.isPaid,
        paidDate: emi.paidDate?.toISOString() || null,
        dueDate: emi.dueDate.toISOString(),
        isClosed: loan.isClosed,
        closedAt: loan.closedAt?.toISOString() || null,
      }
    })

  // Get SIPs for this month
  const sips = await prisma.sIP.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lt: endDate },
      OR: [
        { endDate: null },
        { endDate: { gte: startDate } },
      ],
    },
  })

  let totalSIPs = 0
  sips.forEach((sip) => {
    const sipAmount = Number(sip.amount)
    const amountForMonth = getAmountForMonth(
      sipAmount,
      sip.frequency,
      new Date(sip.startDate),
      month - 1, // month - 1 because getAmountForMonth expects 0-based month
      year
    )
    totalSIPs += amountForMonth
  })

  // Get expenses for this month
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
  })

  let totalExpenses = 0
  let expectedExpenses = 0
  let unexpectedExpenses = 0
  let needsExpenses = 0
  let avoidExpenses = 0

  for (const expense of expenses) {
    const amount = Number(expense.amount)
    totalExpenses += amount

    if (expense.expenseType === "EXPECTED") {
      expectedExpenses += amount
    } else {
      unexpectedExpenses += amount
    }

    if (expense.category === "NEEDS") {
      needsExpenses += amount
    } else if (expense.category === "PARTIAL_NEEDS") {
      needsExpenses += expense.needsPortion ? Number(expense.needsPortion) : 0
      avoidExpenses += expense.avoidPortion ? Number(expense.avoidPortion) : 0
    } else {
      avoidExpenses += amount
    }
  }

  // Get budget and allocations
  const budgetData = await prisma.expenseBudget.findUnique({
    where: { userId },
  })

  const budget = budgetData ? {
    expectedPercent: budgetData.expectedPercent ? Number(budgetData.expectedPercent) : null,
    expectedAmount: budgetData.expectedAmount ? Number(budgetData.expectedAmount) : null,
    unexpectedPercent: budgetData.unexpectedPercent ? Number(budgetData.unexpectedPercent) : null,
    unexpectedAmount: budgetData.unexpectedAmount ? Number(budgetData.unexpectedAmount) : null,
  } : null

  const allocationData = await prisma.investmentAllocation.findMany({
    where: { userId },
  })

  const allocations = allocationData.map(a => ({
    bucket: a.bucket,
    allocationType: a.allocationType as "PERCENTAGE" | "AMOUNT",
    percent: a.percent ? Number(a.percent) : null,
    customAmount: a.customAmount ? Number(a.customAmount) : null,
  }))

  // Get member transactions for this month (need this before calculating financial summary)
  const memberTransactionsPrelim = await prisma.memberTransaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lt: endDate },
      isSettled: false,
    },
  })

  let memberBorrowedPrelim = 0
  let memberLentPrelim = 0

  memberTransactionsPrelim.forEach(txn => {
    const amount = Number(txn.amount)
    if (txn.transactionType === "OWE" || txn.transactionType === "EXPENSE_PAID_BY_THEM") {
      memberBorrowedPrelim += amount
    } else if (txn.transactionType === "GAVE" || txn.transactionType === "EXPENSE_PAID_FOR_THEM") {
      memberLentPrelim += amount
    }
  })

  // Use financial summary calculation with budget/allocation logic
  const financialSummary = calculateFinancialSummary(
    salary,
    taxAmount,
    totalLoans,
    totalSIPs,
    totalExpenses,
    budget,
    allocations,
    0, // oneTimeInvestments - will be calculated later
    0, // sipExecutions - will be calculated later
    0, // paidEMIs - will be calculated later
    0, // additionalEMIPaid - will be calculated later
    memberBorrowedPrelim,
    memberLentPrelim
  )

  // Get previous month surplus
  const previousMonth = month === 1 ? 12 : month - 1
  const previousYear = month === 1 ? year - 1 : year

  const previousSnapshot = await prisma.monthlySnapshot.findUnique({
    where: {
      userId_year_month: {
        userId,
        year: previousYear,
        month: previousMonth,
      },
    },
  })

  const previousSurplus = previousSnapshot ? Number(previousSnapshot.surplusAmount) : 0

  // ============ EMI DETAILS ============
  // Get all paid EMIs in this month (by payment date)
  const paidEMIs = await prisma.eMI.findMany({
    where: {
      loan: { userId },
      isPaid: true,
      paidDate: { gte: startDate, lt: endDate },
    },
  })

  // Separate current month EMIs vs additional payments (old dues/advance)
  const currentMonthEMIs = paidEMIs.filter(emi => {
    const dueDate = new Date(emi.dueDate)
    return dueDate >= startDate && dueDate < endDate
  })

  const additionalEMIs = paidEMIs.filter(emi => {
    const dueDate = new Date(emi.dueDate)
    return dueDate < startDate || dueDate >= endDate
  })

  const currentMonthEMIPaid = currentMonthEMIs.reduce((sum, emi) => sum + Number(emi.paidAmount || emi.emiAmount), 0)
  const currentMonthEMIPaidCount = currentMonthEMIs.length
  const additionalEMIPaid = additionalEMIs.reduce((sum, emi) => sum + Number(emi.paidAmount || emi.emiAmount), 0)
  const additionalEMIPaidCount = additionalEMIs.length

  // Get unpaid EMIs for current month (by due date)
  const unpaidEMIs = await prisma.eMI.findMany({
    where: {
      loan: { userId },
      isPaid: false,
      dueDate: { gte: startDate, lt: endDate },
    },
  })

  const currentMonthEMIUnpaid = unpaidEMIs.reduce((sum, emi) => sum + Number(emi.emiAmount), 0)
  const currentMonthEMIUnpaidCount = unpaidEMIs.length

  // ============ SIP & INVESTMENT DETAILS ============
  // Get SIP executions for this month
  const sipExecutions = await prisma.sIPExecution.findMany({
    where: {
      userId,
      executionDate: { gte: startDate, lt: endDate },
      status: "SUCCESS",
    },
  })

  const sipExecutionsAmount = sipExecutions.reduce((sum, exec) => sum + Number(exec.amount), 0)
  const sipExecutionsCount = sipExecutions.length

  // Get one-time investment transactions for this month
  const oneTimeTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      purchaseDate: { gte: startDate, lt: endDate },
      transactionType: "ONE_TIME_PURCHASE",
    },
  })

  const oneTimeInvestments = oneTimeTransactions.reduce((sum, txn) => {
    // Use INR amount if available, otherwise use the transaction amount
    return sum + Number(txn.amountInr || txn.amount)
  }, 0)
  const oneTimeInvestmentsCount = oneTimeTransactions.length

  // Additional transactions (one-time + additional EMI paid)
  const additionalTransactions = oneTimeInvestments + additionalEMIPaid

  // ============ INVESTMENT RETURNS ============
  // Get all transactions (SIP + one-time) made this month
  const allMonthTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      purchaseDate: { gte: startDate, lt: endDate },
      transactionType: { in: ["SIP_EXECUTION", "ONE_TIME_PURCHASE"] },
    },
    include: {
      holding: true,
    },
  })

  let totalInvestedThisMonth = 0
  let totalCurrentValueThisMonth = 0

  allMonthTransactions.forEach(txn => {
    const qty = Number(txn.qty)
    const buyPrice = Number(txn.price)
    const currentPrice = txn.holding?.currentPrice ? Number(txn.holding.currentPrice) : buyPrice

    totalInvestedThisMonth += qty * buyPrice
    totalCurrentValueThisMonth += qty * currentPrice
  })

  const currentMonthReturns = totalCurrentValueThisMonth - totalInvestedThisMonth
  const currentMonthReturnsPct = totalInvestedThisMonth > 0 ? (currentMonthReturns / totalInvestedThisMonth) * 100 : 0

  // Calculate SIP-only returns
  const sipOnlyTransactions = allMonthTransactions.filter(txn => txn.transactionType === "SIP_EXECUTION")
  let sipInvestedThisMonth = 0
  let sipCurrentValueThisMonth = 0

  sipOnlyTransactions.forEach(txn => {
    const qty = Number(txn.qty)
    const buyPrice = Number(txn.price)
    const currentPrice = txn.holding?.currentPrice ? Number(txn.holding.currentPrice) : buyPrice

    sipInvestedThisMonth += qty * buyPrice
    sipCurrentValueThisMonth += qty * currentPrice
  })

  const monthOnMonthSIPProfit = sipCurrentValueThisMonth - sipInvestedThisMonth
  const monthOnMonthSIPProfitPct = sipInvestedThisMonth > 0 ? (monthOnMonthSIPProfit / sipInvestedThisMonth) * 100 : 0

  // Overall portfolio value and P&L
  const allHoldings = await prisma.holding.findMany({
    where: { userId },
  })

  let overallPortfolioValue = 0
  let overallPortfolioCost = 0

  allHoldings.forEach(holding => {
    const qty = Number(holding.qty)
    const avgCost = Number(holding.avgCost)
    const currentPrice = holding.currentPrice ? Number(holding.currentPrice) : avgCost

    overallPortfolioCost += qty * avgCost
    overallPortfolioValue += qty * currentPrice
  })

  const overallPortfolioPnL = overallPortfolioValue - overallPortfolioCost
  const overallPortfolioPnLPct = overallPortfolioCost > 0 ? (overallPortfolioPnL / overallPortfolioCost) * 100 : 0

  // ============ BUDGET TRACKING ============
  const plannedExpenses = financialSummary.isUsingBudget
    ? financialSummary.availableForExpenses
    : 0
  const expectedBudget = financialSummary.expectedBudget
  const unexpectedBudget = financialSummary.unexpectedBudget
  const isUsingBudget = financialSummary.isUsingBudget

  // ============ LOAN LIFECYCLE ============
  // Get loans added this month
  const loansAdded = await prisma.loan.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lt: endDate },
    },
  })

  const loansAddedCount = loansAdded.length
  const loansAddedData = loansAdded.map(loan => ({
    loanId: loan.id,
    loanType: loan.loanType,
    institution: loan.institution,
    principalAmount: Number(loan.principalAmount),
    createdAt: loan.createdAt.toISOString(),
  }))

  // Get loans closed this month
  const loansClosed = await prisma.loan.findMany({
    where: {
      userId,
      isClosed: true,
      closedAt: { gte: startDate, lt: endDate },
    },
  })

  const loansClosedCount = loansClosed.length
  const loansClosedData = loansClosed.map(loan => ({
    loanId: loan.id,
    loanType: loan.loanType,
    institution: loan.institution,
    closedAt: loan.closedAt?.toISOString() || null,
  }))

  // ============ MEMBER TRANSACTIONS ============
  // Fetch member transactions with member details for snapshot data
  const memberTransactionsWithDetails = await prisma.memberTransaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lt: endDate },
      isSettled: false,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
  })

  const memberTransactionsData = memberTransactionsWithDetails.map(txn => ({
    memberId: txn.member.id,
    memberName: txn.member.name,
    memberCategory: txn.member.category,
    transactionType: txn.transactionType,
    amount: Number(txn.amount),
    date: txn.date.toISOString(),
  }))

  const memberTransactionsCount = memberTransactionsWithDetails.length
  const memberBorrowed = memberBorrowedPrelim
  const memberLent = memberLentPrelim

  // ============ SURPLUS CALCULATIONS ============
  // One-time purchases are now tracked through holdings, not separately
  const investmentsMade = 0

  // Calculate available amount (base surplus after deductions)
  const availableAmount = financialSummary.availableSurplus
  const spentAmount = totalExpenses + investmentsMade
  const surplusAmount = availableAmount - spentAmount

  // Planned surplus (after scheduled EMI, planned SIPs, and expenses)
  const plannedSurplus = financialSummary.plannedSurplus

  // Cash remaining (after all actual transactions)
  // Start with income, deduct tax
  const afterActualTax = salary - taxAmount

  // Use actual paid EMIs instead of scheduled
  const afterActualEMIs = afterActualTax - currentMonthEMIPaid

  // For SIPs, use successful executions if available, otherwise use planned
  const actualSIPAmount = sipExecutionsAmount > 0 ? sipExecutionsAmount : totalSIPs
  const afterActualSIPs = afterActualEMIs - actualSIPAmount

  // Apply member transactions: borrowed adds (like income), lent subtracts (like expense)
  const afterActualMemberTransactions = afterActualSIPs + memberBorrowed - memberLent

  // Deduct actual expenses and one-time investments
  const cashRemaining = afterActualMemberTransactions - totalExpenses - oneTimeInvestments

  // Calculate borrowed funds summary
  const borrowedFundsSummary = await calculateBorrowedFundsSummary(userId, month, year)

  return {
    salary,
    taxAmount,
    afterTax,
    totalLoans,
    totalSIPs,
    totalExpenses,
    expectedExpenses,
    unexpectedExpenses,
    needsExpenses,
    avoidExpenses,
    availableAmount,
    spentAmount,
    surplusAmount,
    plannedSurplus,
    cashRemaining,
    previousSurplus,
    investmentsMade,
    loansData,

    // EMI Details
    currentMonthEMIPaid,
    currentMonthEMIUnpaid,
    currentMonthEMIPaidCount,
    currentMonthEMIUnpaidCount,
    additionalEMIPaid,
    additionalEMIPaidCount,

    // SIP & Investment Details
    totalSIPInvested: totalSIPs,
    sipExecutionsAmount,
    sipExecutionsCount,
    oneTimeInvestments,
    oneTimeInvestmentsCount,
    additionalTransactions,

    // Investment Returns
    monthOnMonthSIPProfit,
    monthOnMonthSIPProfitPct,
    currentMonthReturns,
    currentMonthReturnsPct,
    overallPortfolioValue,
    overallPortfolioPnL,
    overallPortfolioPnLPct,

    // Budget Tracking
    plannedExpenses,
    expectedBudget,
    unexpectedBudget,
    isUsingBudget,

    // Loan Lifecycle
    loansAdded: loansAddedCount,
    loansAddedData,
    loansClosed: loansClosedCount,
    loansClosedData,

    // Member Transactions
    memberBorrowed,
    memberLent,
    memberTransactionsCount,
    memberTransactionsData,

    // Borrowed Funds
    borrowedFundsReceived: borrowedFundsSummary.borrowedFundsReceived,
    borrowedFundsReturned: borrowedFundsSummary.borrowedFundsReturned,
    borrowedFundsCount: borrowedFundsSummary.borrowedFundsCount,
    borrowedFundsData: borrowedFundsSummary.borrowedFundsData,
    borrowedFundsProfit: borrowedFundsSummary.borrowedFundsProfit,
  }
}
