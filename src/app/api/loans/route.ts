import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"
import { autoCalculateLoanField } from "@/lib/emi-calculator"

const paymentScheduleSchema = z.object({
  dates: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    })
  ),
})

const goldLoanItemSchema = z.object({
  title: z.string().min(1),
  carat: z.number().int().min(1).max(24),
  quantity: z.number().int().positive(),
  grossWeight: z.number().positive(),
  netWeight: z.number().positive(),
  loanAmount: z.number().positive().optional(),
})

const customEMISchema = z.object({
  installmentNumber: z.number().int().positive(),
  amount: z.number().positive(),
})

const loanSchema = z.object({
  loanType: z.enum([
    "HOME_LOAN",
    "CAR_LOAN",
    "PERSONAL_LOAN",
    "EDUCATION_LOAN",
    "BUSINESS_LOAN",
    "GOLD_LOAN",
    "CREDIT_CARD",
    "OTHER",
  ]),
  institution: z.string().min(1),
  accountHolderName: z.string().min(1),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  tenure: z.number().int().positive().optional(),
  emiAmount: z.number().positive().optional(),
  emiFrequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUALLY", "CUSTOM"]),
  paymentSchedule: paymentScheduleSchema.optional(),
  startDate: z.string(),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
  goldItems: z.array(goldLoanItemSchema).optional(),
  customEMIs: z.array(customEMISchema).optional(),
}).refine((data) => data.tenure || data.emiAmount, {
  message: "Either tenure or EMI amount must be provided",
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current month start and end dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const loans = await prisma.loan.findMany({
      where: {
        userId: session.user.id,
        OR: [
          // All active loans
          { isActive: true, isClosed: false },
          // Closed loans from current month
          {
            isClosed: true,
            closedAt: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            }
          },
        ],
      },
      include: {
        goldItems: true,
      },
      orderBy: [
        { isClosed: "asc" }, // Active loans first
        { startDate: "asc" }, // Then by start date (oldest first)
      ],
    })

    // Calculate remaining tenure and check for current month EMIs
    const transformedLoans = await Promise.all(loans.map(async (loan) => {
      // Fetch EMIs separately to ensure we get all overdue + current + upcoming
      // 1. Get all overdue unpaid EMIs (from previous months)
      const overdueEmis = await prisma.eMI.findMany({
        where: {
          loanId: loan.id,
          isPaid: false,
          dueDate: {
            lt: currentMonthStart,
          },
        },
        orderBy: { dueDate: "asc" },
      })

      // 2. Get current month EMIs (both paid and unpaid)
      const currentMonthEmis = await prisma.eMI.findMany({
        where: {
          loanId: loan.id,
          dueDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        orderBy: { dueDate: "asc" },
      })

      // 3. Get next few upcoming EMIs (after current month, limit to 3)
      const upcomingEmis = await prisma.eMI.findMany({
        where: {
          loanId: loan.id,
          isPaid: false,
          dueDate: {
            gt: currentMonthEnd,
          },
        },
        orderBy: { dueDate: "asc" },
        take: 3,
      })

      // Combine all EMIs (overdue + current + upcoming) and remove duplicates
      const allEmisMap = new Map()
      ;[...overdueEmis, ...currentMonthEmis, ...upcomingEmis].forEach(emi => {
        allEmisMap.set(emi.id, emi)
      })
      const combinedEmis = Array.from(allEmisMap.values()).sort((a, b) =>
        a.dueDate.getTime() - b.dueDate.getTime()
      )
      // Count ALL unpaid EMIs for accurate remaining tenure
      const remainingTenure = await prisma.eMI.count({
        where: {
          loanId: loan.id,
          isPaid: false,
        }
      })

      // Check if loan has any EMI due in current month (paid or unpaid)
      const hasCurrentMonthDue = await prisma.eMI.count({
        where: {
          loanId: loan.id,
          dueDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          }
        }
      }) > 0

      // Get the earliest unpaid EMI due date for sorting
      const earliestUnpaidEmi = await prisma.eMI.findFirst({
        where: {
          loanId: loan.id,
          isPaid: false,
        },
        orderBy: {
          dueDate: 'asc',
        },
        select: {
          dueDate: true,
        }
      })

      return {
        ...loan,
        principalAmount: Number(loan.principalAmount),
        interestRate: Number(loan.interestRate),
        emiAmount: Number(loan.emiAmount),
        currentOutstanding: Number(loan.currentOutstanding),
        totalPaid: Number(loan.totalPaid),
        remainingTenure,
        hasCurrentMonthDue,
        earliestDueDate: earliestUnpaidEmi?.dueDate || null,
        emis: combinedEmis.map(emi => ({
          ...emi,
          emiAmount: Number(emi.emiAmount),
          paidAmount: emi.paidAmount ? Number(emi.paidAmount) : null,
          principalPaid: emi.principalPaid ? Number(emi.principalPaid) : null,
          interestPaid: emi.interestPaid ? Number(emi.interestPaid) : null,
          lateFee: emi.lateFee ? Number(emi.lateFee) : null,
        })),
        goldItems: loan.goldItems?.map(item => ({
          ...item,
          carat: Number(item.carat),
          quantity: Number(item.quantity),
          grossWeight: Number(item.grossWeight),
          netWeight: Number(item.netWeight),
          loanAmount: item.loanAmount ? Number(item.loanAmount) : null,
        })) || [],
      }
    }))

    // Sort by: 1) Active loans first, 2) Current month due, 3) Due date (ascending), 4) Principal amount (ascending)
    transformedLoans.sort((a, b) => {
      // Active loans first, closed loans at the end
      if (a.isActive && !a.isClosed && (b.isClosed || !b.isActive)) return -1
      if ((a.isClosed || !a.isActive) && b.isActive && !b.isClosed) return 1

      // For active loans, prioritize those with current month dues
      if (a.isActive && !a.isClosed && b.isActive && !b.isClosed) {
        if (a.hasCurrentMonthDue && !b.hasCurrentMonthDue) return -1
        if (!a.hasCurrentMonthDue && b.hasCurrentMonthDue) return 1

        // If both have or don't have current month dues, sort by earliest due date (ascending)
        if (a.earliestDueDate && b.earliestDueDate) {
          const dateDiff = new Date(a.earliestDueDate).getTime() - new Date(b.earliestDueDate).getTime()
          if (dateDiff !== 0) return dateDiff
        } else if (a.earliestDueDate && !b.earliestDueDate) {
          return -1 // Loans with due dates come first
        } else if (!a.earliestDueDate && b.earliestDueDate) {
          return 1
        }

        // If same due date or both have no due dates, sort by principal amount (ascending)
        return a.principalAmount - b.principalAmount
      }

      // For closed/inactive loans, sort by principal amount
      return a.principalAmount - b.principalAmount
    })

    return NextResponse.json(transformedLoans, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error("Error fetching loans:", error)
    return NextResponse.json(
      { error: "Failed to fetch loans" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = loanSchema.parse(body)

    // Validate that the start date is not in a closed month
    const loanStartDate = new Date(data.startDate)
    await validateMonthNotClosed(session.user.id, loanStartDate, "create a loan")

    // Auto-calculate EMI or tenure based on what's provided
    const calculatedValues = autoCalculateLoanField({
      principalAmount: data.principalAmount,
      interestRate: data.interestRate,
      tenure: data.tenure,
      emiAmount: data.emiAmount,
      frequency: data.emiFrequency,
    })

    const finalEMIAmount = calculatedValues.emiAmount
    const finalTenure = calculatedValues.tenure

    // Helper function to calculate months between payments based on frequency
    const getMonthsIncrement = (frequency: string): number => {
      switch (frequency) {
        case "MONTHLY":
          return 1
        case "QUARTERLY":
          return 3
        case "HALF_YEARLY":
          return 6
        case "ANNUALLY":
          return 12
        case "CUSTOM":
          return 1 // For custom, we'll handle it differently
        default:
          return 1
      }
    }

    // Generate EMI schedule based on frequency and payment schedule
    const emis = []
    const startDate = new Date(data.startDate)
    const startYear = startDate.getFullYear()

    // Create a map of custom EMI amounts if provided
    const customEMIMap = new Map<number, number>()
    if (data.customEMIs && data.customEMIs.length > 0) {
      data.customEMIs.forEach(emi => {
        customEMIMap.set(emi.installmentNumber, emi.amount)
      })
    }

    if (data.emiFrequency === "MONTHLY") {
      // Monthly frequency: generate EMIs for each month
      const totalPayments = finalTenure

      for (let i = 0; i < totalPayments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)

        // Use custom EMI amount if available, otherwise use calculated amount
        const customEMIAmount: number = customEMIMap.get(i + 1) || finalEMIAmount

        emis.push({
          emiAmount: customEMIAmount,
          dueDate,
          isPaid: false,
        })
      }
    } else if (data.paymentSchedule && data.paymentSchedule.dates.length > 0) {
      // For QUARTERLY, HALF_YEARLY, ANNUALLY, CUSTOM: use payment schedule
      const { dates } = data.paymentSchedule
      const monthsIncrement = getMonthsIncrement(data.emiFrequency)

      // Calculate how many years we need based on tenure
      let totalPayments: number
      if (data.emiFrequency === "CUSTOM") {
        // For custom, tenure is in months, divide by number of dates per year
        totalPayments = Math.ceil(finalTenure / dates.length)
      } else {
        totalPayments = Math.ceil(finalTenure / monthsIncrement)
      }

      // Calculate minimum first EMI date (at least one frequency period after start date)
      const minFirstEmiDate = new Date(startDate)
      minFirstEmiDate.setMonth(minFirstEmiDate.getMonth() + monthsIncrement)

      // Calculate the first occurrence of each schedule date on or after minFirstEmiDate
      const scheduleWithFirstOccurrence = dates.map(scheduleDate => {
        const firstOccurrence = new Date(startYear, scheduleDate.month - 1, scheduleDate.day)

        // Keep moving to next year until we find a date >= minFirstEmiDate
        while (firstOccurrence < minFirstEmiDate) {
          firstOccurrence.setFullYear(firstOccurrence.getFullYear() + 1)
        }

        return { scheduleDate, firstOccurrence }
      })

      // Sort by first occurrence to maintain chronological order
      scheduleWithFirstOccurrence.sort((a, b) => a.firstOccurrence.getTime() - b.firstOccurrence.getTime())

      // Generate EMIs for each year
      for (let year = 0; year < Math.ceil(totalPayments / dates.length) + 1; year++) {
        for (const { firstOccurrence } of scheduleWithFirstOccurrence) {
          const dueDate = new Date(firstOccurrence)
          dueDate.setFullYear(firstOccurrence.getFullYear() + year)

          // Use custom EMI amount if available, otherwise use calculated amount
          const customEMIAmount: number = customEMIMap.get(emis.length + 1) || finalEMIAmount

          emis.push({
            emiAmount: customEMIAmount,
            dueDate,
            isPaid: false,
          })

          // Stop when we have enough payments
          if (emis.length >= totalPayments) {
            break
          }
        }

        if (emis.length >= totalPayments) {
          break
        }
      }
    } else {
      // Fallback to simple monthly if no payment schedule provided
      const monthsIncrement = getMonthsIncrement(data.emiFrequency)
      const totalPayments = Math.ceil(finalTenure / monthsIncrement)

      for (let i = 0; i < totalPayments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + (i * monthsIncrement))

        // Use custom EMI amount if available, otherwise use calculated amount
        const customEMIAmount: number = customEMIMap.get(i + 1) || finalEMIAmount

        emis.push({
          emiAmount: customEMIAmount,
          dueDate,
          isPaid: false,
        })
      }
    }

    // Debug: Log EMI generation
    console.log('Generated EMIs count:', emis.length)
    console.log('First few EMIs:', emis.slice(0, 3))

    // Create loan with EMI schedule and gold items (if gold loan)
    const loan = await prisma.loan.create({
      data: {
        loanType: data.loanType,
        institution: data.institution,
        accountHolderName: data.accountHolderName,
        principalAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenure: finalTenure,
        emiAmount: finalEMIAmount,
        emiFrequency: data.emiFrequency,
        paymentSchedule: data.paymentSchedule || undefined,
        startDate: new Date(data.startDate),
        currentOutstanding: data.principalAmount,
        accountNumber: data.accountNumber,
        description: data.description,
        userId: session.user.id,
        emis: emis.length > 0 ? {
          create: emis,
        } : undefined,
        goldItems: data.loanType === "GOLD_LOAN" && data.goldItems ? {
          create: data.goldItems.map(item => ({
            title: item.title,
            carat: item.carat,
            quantity: item.quantity,
            grossWeight: item.grossWeight,
            netWeight: item.netWeight,
            loanAmount: item.loanAmount,
          }))
        } : undefined,
      },
      include: {
        emis: {
          orderBy: { dueDate: "asc" },
          take: 3,
        },
        goldItems: true,
      },
    })

    return NextResponse.json({
      ...loan,
      principalAmount: Number(loan.principalAmount),
      interestRate: Number(loan.interestRate),
      emiAmount: Number(loan.emiAmount),
      currentOutstanding: Number(loan.currentOutstanding),
      totalPaid: Number(loan.totalPaid),
      goldItems: loan.goldItems?.map(item => ({
        ...item,
        carat: Number(item.carat),
        quantity: Number(item.quantity),
        grossWeight: Number(item.grossWeight),
        netWeight: Number(item.netWeight),
        loanAmount: item.loanAmount ? Number(item.loanAmount) : null,
      })) || [],
      emis: loan.emis.map(emi => ({
        ...emi,
        emiAmount: Number(emi.emiAmount),
      })),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes("month has been closed")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error creating loan:", error)
    return NextResponse.json(
      { error: "Failed to create loan" },
      { status: 500 }
    )
  }
}
