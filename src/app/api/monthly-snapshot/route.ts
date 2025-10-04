import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateFinancialSummary } from "@/lib/budget-utils"

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

// Close current month and create snapshot
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { month, year } = body

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

    if (existing?.isClosed) {
      return NextResponse.json(
        { error: "Month already closed" },
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

  const totalLoans = loans.reduce((sum, loan) => sum + Number(loan.emiAmount), 0)

  // Build loan tracking data
  const loansData = loans.map(loan => {
    const emi = loan.emis[0] // Get the EMI for this month
    return {
      loanId: loan.id,
      loanType: loan.loanType,
      institution: loan.institution,
      emiAmount: Number(loan.emiAmount),
      isPaid: emi?.isPaid || false,
      paidDate: emi?.paidDate?.toISOString() || null,
      dueDate: emi?.dueDate?.toISOString() || null,
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
    if (sip.frequency === "MONTHLY") {
      totalSIPs += sipAmount
    } else if (sip.frequency === "YEARLY") {
      const sipStartDate = new Date(sip.startDate)
      if (sipStartDate.getMonth() === month - 1) {
        totalSIPs += sipAmount
      }
    } else if (sip.frequency === "CUSTOM" && sip.customDay) {
      totalSIPs += sipAmount
    }
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

  // Use financial summary calculation with budget/allocation logic
  const financialSummary = calculateFinancialSummary(
    salary,
    taxAmount,
    totalLoans,
    totalSIPs,
    totalExpenses,
    budget,
    allocations
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

  // One-time purchases are now tracked through holdings, not separately
  const investmentsMade = 0

  // Calculate available amount (base surplus after deductions)
  const availableAmount = financialSummary.availableSurplus
  const spentAmount = totalExpenses + investmentsMade
  const surplusAmount = availableAmount - spentAmount

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
    previousSurplus,
    investmentsMade,
    loansData,
  }
}
