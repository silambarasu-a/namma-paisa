import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"

const paymentScheduleSchema = z.object({
  dates: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    })
  ),
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
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  tenure: z.number().int().positive(),
  emiAmount: z.number().positive(),
  emiFrequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUALLY", "CUSTOM"]),
  paymentSchedule: paymentScheduleSchema.optional(),
  startDate: z.string(),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
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
        emis: {
          where: {
            OR: [
              // All unpaid EMIs
              {
                isPaid: false,
              },
              // Paid EMIs from current month
              {
                isPaid: true,
                paidDate: {
                  gte: currentMonthStart,
                  lte: currentMonthEnd,
                },
              },
            ],
          },
          orderBy: { dueDate: "asc" },
          take: 5,
        },
      },
      orderBy: [
        { isClosed: "asc" }, // Active loans first
        { startDate: "asc" }, // Then by start date (oldest first)
      ],
    })

    // Calculate remaining tenure and transform the response
    const transformedLoans = await Promise.all(loans.map(async (loan) => {
      // Count ALL unpaid EMIs for accurate remaining tenure
      const remainingTenure = await prisma.eMI.count({
        where: {
          loanId: loan.id,
          isPaid: false,
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
        emis: loan.emis.map(emi => ({
          ...emi,
          emiAmount: Number(emi.emiAmount),
          paidAmount: emi.paidAmount ? Number(emi.paidAmount) : null,
          principalPaid: emi.principalPaid ? Number(emi.principalPaid) : null,
          interestPaid: emi.interestPaid ? Number(emi.interestPaid) : null,
          lateFee: emi.lateFee ? Number(emi.lateFee) : null,
        }))
      }
    }))

    // Sort by remaining tenure (loans closing first)
    transformedLoans.sort((a, b) => {
      // Closed loans at the end
      if (a.isClosed && !b.isClosed) return 1
      if (!a.isClosed && b.isClosed) return -1
      // For active loans, sort by remaining tenure (ascending)
      return a.remainingTenure - b.remainingTenure
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

    if (data.emiFrequency === "MONTHLY") {
      // Monthly frequency: generate EMIs for each month
      const totalPayments = data.tenure

      for (let i = 0; i < totalPayments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)

        emis.push({
          emiAmount: data.emiAmount,
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
        totalPayments = Math.ceil(data.tenure / dates.length)
      } else {
        totalPayments = Math.ceil(data.tenure / monthsIncrement)
      }

      // Generate EMIs for each year
      for (let year = 0; year < Math.ceil(totalPayments / dates.length); year++) {
        for (const scheduleDate of dates) {
          const dueDate = new Date(startYear + year, scheduleDate.month - 1, scheduleDate.day)

          // Only add if the due date is on or after the start date
          if (dueDate >= startDate) {
            emis.push({
              emiAmount: data.emiAmount,
              dueDate,
              isPaid: false,
            })
          }

          // Stop when we have enough payments
          if (emis.length >= totalPayments) {
            break
          }
        }

        if (emis.length >= totalPayments) {
          break
        }
      }

      // Trim to exact number of payments needed
      emis.splice(totalPayments)
    } else {
      // Fallback to simple monthly if no payment schedule provided
      const monthsIncrement = getMonthsIncrement(data.emiFrequency)
      const totalPayments = Math.ceil(data.tenure / monthsIncrement)

      for (let i = 0; i < totalPayments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + (i * monthsIncrement))

        emis.push({
          emiAmount: data.emiAmount,
          dueDate,
          isPaid: false,
        })
      }
    }

    // Create loan with EMI schedule
    const loan = await prisma.loan.create({
      data: {
        loanType: data.loanType,
        institution: data.institution,
        principalAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenure: data.tenure,
        emiAmount: data.emiAmount,
        emiFrequency: data.emiFrequency,
        paymentSchedule: data.paymentSchedule || undefined,
        startDate: new Date(data.startDate),
        currentOutstanding: data.principalAmount,
        accountNumber: data.accountNumber,
        description: data.description,
        userId: session.user.id,
        emis: {
          create: emis,
        },
      },
      include: {
        emis: {
          orderBy: { dueDate: "asc" },
          take: 3,
        },
      },
    })

    return NextResponse.json(loan, { status: 201 })
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
