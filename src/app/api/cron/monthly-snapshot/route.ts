import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Auto-close previous month for all users
// This should be called by a cron job on the 1st of each month
export async function POST(request: Request) {
  try {
    // Check for cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

    console.log(`Starting monthly snapshot for ${previousMonth}/${previousYear}`)

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    })

    let created = 0
    let updated = 0
    let skipped = 0
    let failed = 0

    for (const user of users) {
      try {
        // Check if snapshot already exists and is closed
        const existing = await prisma.monthlySnapshot.findUnique({
          where: {
            userId_year_month: {
              userId: user.id,
              year: previousYear,
              month: previousMonth,
            },
          },
        })

        if (existing?.isClosed) {
          skipped++
          console.log(`Skipped ${user.email} - already closed`)
          continue
        }

        // Calculate month data
        const data = await calculateMonthlyData(user.id, previousYear, previousMonth)

        // Create or update snapshot
        const snapshot = await prisma.monthlySnapshot.upsert({
          where: {
            userId_year_month: {
              userId: user.id,
              year: previousYear,
              month: previousMonth,
            },
          },
          create: {
            userId: user.id,
            month: previousMonth,
            year: previousYear,
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

        if (existing) {
          updated++
          console.log(`Updated snapshot for ${user.email}`)
        } else {
          created++
          console.log(`Created snapshot for ${user.email}`)
        }
      } catch (error) {
        failed++
        console.error(`Failed to create snapshot for ${user.email}:`, error)
      }
    }

    console.log(`Monthly snapshot complete: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`)

    return NextResponse.json({
      success: true,
      month: previousMonth,
      year: previousYear,
      stats: {
        totalUsers: users.length,
        created,
        updated,
        skipped,
        failed,
      },
    })
  } catch (error) {
    console.error("Error in monthly snapshot cron:", error)
    return NextResponse.json(
      { error: "Failed to create monthly snapshots" },
      { status: 500 }
    )
  }
}

// Allow GET for manual trigger (admin only)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")

    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call POST internally
    return POST(request)
  } catch (error) {
    return NextResponse.json({ error: "Failed to trigger snapshot" }, { status: 500 })
  }
}

async function calculateMonthlyData(userId: string, year: number, month: number) {
  // Get date range for the month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  // Get salary
  const latestSalary = await prisma.netSalaryHistory.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: endDate }
    },
    orderBy: { effectiveFrom: "desc" },
  })
  const netSalary = latestSalary ? Number(latestSalary.netMonthly) : 0

  // Get tax
  const taxSetting = await prisma.taxSetting.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })

  let taxAmount = 0
  if (taxSetting && netSalary > 0) {
    switch (taxSetting.mode) {
      case "PERCENTAGE":
        taxAmount = taxSetting.percentage ? (netSalary * Number(taxSetting.percentage)) / 100 : 0
        break
      case "FIXED":
        taxAmount = taxSetting.fixedAmount ? Number(taxSetting.fixedAmount) : 0
        break
      case "HYBRID":
        const percentAmount = taxSetting.percentage ? (netSalary * Number(taxSetting.percentage)) / 100 : 0
        const fixedAmount = taxSetting.fixedAmount ? Number(taxSetting.fixedAmount) : 0
        taxAmount = percentAmount + fixedAmount
        break
    }
  }

  const afterTax = netSalary - taxAmount

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
    netSalary,
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
