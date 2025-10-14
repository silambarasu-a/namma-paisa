import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculatePaymentDueDate } from "@/lib/credit-card-utils"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"
import { Prisma } from "@/generated/prisma"

const expenseSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  expenseType: z.enum(["EXPECTED", "UNEXPECTED"]),
  category: z.enum(["NEEDS", "PARTIAL_NEEDS", "AVOID"]),
  amount: z.number().positive("Amount must be positive"),
  needsPortion: z.number().optional(),
  avoidPortion: z.number().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  creditCardId: z.string().optional(),
  // Member tracking fields
  memberId: z.string().optional(),
  paidByMember: z.boolean().optional(),
  paidForMember: z.boolean().optional(),
}).refine((data) => {
  if (data.category === "PARTIAL_NEEDS") {
    if (!data.needsPortion && !data.avoidPortion) {
      return false
    }
    const total = (data.needsPortion || 0) + (data.avoidPortion || 0)
    return Math.abs(total - data.amount) < 0.01
  }
  return true
}, {
  message: "For partial-needs, at least one portion must be provided and sum must equal total amount",
}).refine((data) => {
  // If payment method is CARD, creditCardId is required
  if (data.paymentMethod === "CARD" && !data.creditCardId) {
    return false
  }
  return true
}, {
  message: "Credit card must be selected when payment method is CARD",
}).refine((data) => {
  // If paidByMember or paidForMember is true, memberId is required
  if ((data.paidByMember || data.paidForMember) && !data.memberId) {
    return false
  }
  // Cannot be both paidByMember and paidForMember
  if (data.paidByMember && data.paidForMember) {
    return false
  }
  return true
}, {
  message: "Member must be selected and only one of 'paid by' or 'paid for' can be true",
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "all"
    const sortBy = searchParams.get("sortBy") || "date"
    const limit = parseInt(searchParams.get("limit") || "50")
    const period = searchParams.get("period") || null
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null

    // Build base where clause for date filtering only (for summary)
    const baseWhere: {
      userId: string
      date?: { gte: Date; lt?: Date }
    } = { userId: session.user.id }

    // Add month/year filter (takes precedence over period)
    if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 1)
      baseWhere.date = { gte: startDate, lt: endDate }
    } else if (period) {
      // Add period filter
      const now = new Date()
      let startDate: Date

      switch (period) {
        case "daily":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "weekly":
          const dayOfWeek = now.getDay()
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
          break
        case "monthly":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "yearly":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(0)
      }

      baseWhere.date = { gte: startDate }
    }

    // Build where clause with filter for expenses list
    const where: {
      userId: string
      date?: { gte: Date; lt?: Date }
      category?: "NEEDS" | "PARTIAL_NEEDS" | "AVOID"
      expenseType?: "EXPECTED" | "UNEXPECTED"
    } = { ...baseWhere }

    if (filter !== "all") {
      if (["NEEDS", "PARTIAL_NEEDS", "AVOID"].includes(filter)) {
        where.category = filter as "NEEDS" | "PARTIAL_NEEDS" | "AVOID"
      } else if (["EXPECTED", "UNEXPECTED"].includes(filter)) {
        where.expenseType = filter as "EXPECTED" | "UNEXPECTED"
      }
    }

    // Build orderBy clause - default is date DESC, then title ASC
    let orderBy: Array<{ date?: "desc" | "asc"; amount?: "desc" | "asc"; title?: "asc"; category?: "asc" }> = [{ date: "desc" }, { title: "asc" }]
    if (sortBy === "amount") {
      orderBy = [{ amount: "desc" }]
    } else if (sortBy === "title") {
      orderBy = [{ title: "asc" }]
    } else if (sortBy === "category") {
      orderBy = [{ category: "asc" }]
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        date: true,
        title: true,
        description: true,
        expenseType: true,
        category: true,
        amount: true,
        needsPortion: true,
        avoidPortion: true,
        paymentMethod: true,
        paymentDueDate: true,
        creditCardId: true,
        creditCard: {
          select: {
            cardName: true,
            bank: true,
            lastFourDigits: true,
            billingCycle: true,
            dueDate: true,
          }
        },
        memberId: true,
        paidByMember: true,
        paidForMember: true,
        member: {
          select: {
            id: true,
            name: true,
            category: true,
          }
        },
        createdAt: true,
      },
    })

    // Calculate summary with only date filter (not category/type filter)
    const allExpenses = await prisma.expense.findMany({
      where: baseWhere,
      select: {
        amount: true,
        expenseType: true,
        category: true,
        needsPortion: true,
        avoidPortion: true,
      },
    })

    const summary = allExpenses.reduce(
      (acc, expense) => {
        acc.totalExpenses += Number(expense.amount)
        acc.count += 1

        if (expense.expenseType === "UNEXPECTED") {
          acc.unexpectedTotal += Number(expense.amount)
        } else {
          acc.expectedTotal += Number(expense.amount)
        }

        // Calculate needs and avoid totals
        if (expense.category === "NEEDS") {
          acc.needsTotal += Number(expense.amount)
        } else if (expense.category === "AVOID") {
          acc.avoidTotal += Number(expense.amount)
        } else if (expense.category === "PARTIAL_NEEDS") {
          acc.needsTotal += Number(expense.needsPortion || 0)
          acc.avoidTotal += Number(expense.avoidPortion || 0)
        }

        return acc
      },
      {
        totalExpenses: 0,
        needsTotal: 0,
        avoidTotal: 0,
        expectedTotal: 0,
        unexpectedTotal: 0,
        count: 0,
      }
    )

    return NextResponse.json({ expenses, summary })
  } catch (error) {
    console.error("Expenses fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = expenseSchema.parse(body)

    // Validate that the expense date is not in a closed month
    const expenseDate = new Date(validatedData.date)
    await validateMonthNotClosed(session.user.id, expenseDate, "add an expense")

    // Calculate payment due date for credit card expenses
    let paymentDueDate: Date | null = null
    if (validatedData.paymentMethod === "CARD" && validatedData.creditCardId) {
      const creditCard = await prisma.creditCard.findUnique({
        where: { id: validatedData.creditCardId },
        select: { billingCycle: true, dueDate: true }
      })

      if (creditCard) {
        paymentDueDate = calculatePaymentDueDate(
          new Date(validatedData.date),
          {
            billingCycle: creditCard.billingCycle,
            dueDate: creditCard.dueDate
          }
        )
      }
    }

    // If member is involved, verify they exist
    if (validatedData.memberId) {
      const member = await prisma.member.findFirst({
        where: {
          id: validatedData.memberId,
          userId: session.user.id,
        },
      })

      if (!member) {
        return NextResponse.json(
          { message: "Member not found" },
          { status: 404 }
        )
      }
    }

    // Create expense and member transaction if applicable in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId: session.user.id,
          date: new Date(validatedData.date),
          title: validatedData.title,
          description: validatedData.description || null,
          expenseType: validatedData.expenseType,
          category: validatedData.category,
          amount: validatedData.amount,
          needsPortion: validatedData.needsPortion || null,
          avoidPortion: validatedData.avoidPortion || null,
          paymentMethod: validatedData.paymentMethod,
          creditCardId: validatedData.creditCardId || null,
          paymentDueDate: paymentDueDate,
          memberId: validatedData.memberId || null,
          paidByMember: validatedData.paidByMember || false,
          paidForMember: validatedData.paidForMember || false,
        },
      })

      // Create member transaction if member is involved
      if (validatedData.memberId && (validatedData.paidByMember || validatedData.paidForMember)) {
        const transactionType = validatedData.paidForMember
          ? "EXPENSE_PAID_FOR_THEM"
          : "EXPENSE_PAID_BY_THEM"

        let balanceChange = new Prisma.Decimal(0)

        if (validatedData.paidForMember) {
          // You paid for them - they owe you
          balanceChange = new Prisma.Decimal(validatedData.amount)
        } else if (validatedData.paidByMember) {
          // They paid for you - you owe them
          balanceChange = new Prisma.Decimal(validatedData.amount).negated()
        }

        await tx.memberTransaction.create({
          data: {
            userId: session.user.id,
            memberId: validatedData.memberId,
            transactionType,
            amount: validatedData.amount,
            date: new Date(validatedData.date),
            description: `Expense: ${validatedData.title}`,
            paymentMethod: validatedData.paymentMethod,
            expenseId: expense.id,
          },
        })

        // Update member balance
        await tx.member.update({
          where: { id: validatedData.memberId },
          data: {
            currentBalance: {
              increment: balanceChange,
            },
          },
        })
      }

      return expense
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes("month has been closed")) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    console.error("Expense creation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}