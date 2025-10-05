import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAmountForMonth } from "@/lib/frequency-utils"

// Auto-close previous month for all users
// This should be called by a cron job on the 1st of each month
export async function GET(request: Request) {
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
        await prisma.monthlySnapshot.upsert({
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

// Allow POST for manual trigger with body parameters
export async function POST(request: Request) {
  try {
    // Check for cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call GET handler with the same request
    return GET(request)
  } catch {
    return NextResponse.json({ error: "Failed to trigger snapshot" }, { status: 500 })
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
    const amountForMonth = getAmountForMonth(
      sipAmount,
      sip.frequency,
      new Date(sip.startDate),
      month - 1, // month - 1 because getAmountForMonth expects 0-based month
      year
    )
    totalSIPs += amountForMonth
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

  // Get all transactions for this month (one-time purchases and SIP executions)
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      purchaseDate: {
        gte: startDate,
        lte: endDate,
      },
      transactionType: {
        in: ["ONE_TIME_PURCHASE", "SIP_EXECUTION"],
      },
    },
  })

  const investmentsMade = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0)

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
