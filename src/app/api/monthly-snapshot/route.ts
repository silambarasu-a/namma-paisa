import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get current month snapshot or create if doesn't exist
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

    // Get or create snapshot for current month
    let snapshot = await prisma.monthlySnapshot.findUnique({
      where: {
        userId_year_month: {
          userId: session.user.id,
          year,
          month,
        },
      },
    })

    if (!snapshot) {
      // Create new snapshot
      const data = await calculateMonthlyData(session.user.id, year, month)
      snapshot = await prisma.monthlySnapshot.create({
        data: {
          userId: session.user.id,
          month,
          year,
          ...data,
        },
      })
    }

    return NextResponse.json(snapshot)
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
  const endDate = new Date(year, month, 0, 23, 59, 59)

  // Get salary
  const latestSalary = await prisma.salaryHistory.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: endDate }
    },
    orderBy: { effectiveFrom: "desc" },
  })
  const salary = latestSalary ? Number(latestSalary.monthly) : 0

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

  // Get loans for this month
  const loans = await prisma.loan.findMany({
    where: {
      userId,
      startDate: { lte: endDate },
    },
  })

  let totalLoans = 0
  for (const loan of loans) {
    const loanStartMonth = new Date(loan.startDate.getFullYear(), loan.startDate.getMonth(), 1)
    const currentMonth = new Date(year, month - 1, 1)
    const monthsSinceStart = (currentMonth.getFullYear() - loanStartMonth.getFullYear()) * 12 +
                             (currentMonth.getMonth() - loanStartMonth.getMonth())

    if (monthsSinceStart >= 0 && monthsSinceStart < loan.tenure) {
      totalLoans += Number(loan.emiAmount)
    }
  }

  // Get SIPs for this month
  const sips = await prisma.sIP.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lte: endDate },
      OR: [
        { endDate: null },
        { endDate: { gte: startDate } },
      ],
    },
  })

  let totalSIPs = 0
  for (const sip of sips) {
    const sipAmount = Number(sip.amount)
    if (sip.frequency === "MONTHLY") {
      totalSIPs += sipAmount
    } else if (sip.frequency === "YEARLY") {
      const startMonth = new Date(sip.startDate).getMonth()
      if (startMonth === month - 1) {
        totalSIPs += sipAmount / 12
      }
    } else if (sip.frequency === "CUSTOM" && sip.customDay) {
      // For custom, assume it happened if the day exists in the month
      totalSIPs += sipAmount
    }
  }

  // Get expenses for this month
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
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

  // Calculate available amount
  const availableAmount = afterTax - totalLoans - totalSIPs

  // Calculate surplus
  const spentAmount = totalExpenses
  const surplusAmount = availableAmount - spentAmount

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
    investmentsMade: null,
  }
}
