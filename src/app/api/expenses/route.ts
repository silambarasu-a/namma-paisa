import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculatePaymentDueDate } from "@/lib/credit-card-utils"

const expenseSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  title: z.string().min(1, "Title is required"),
  expenseType: z.enum(["EXPECTED", "UNEXPECTED"]),
  category: z.enum(["NEEDS", "PARTIAL_NEEDS", "AVOID"]),
  amount: z.number().positive("Amount must be positive"),
  needsPortion: z.number().optional(),
  avoidPortion: z.number().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  creditCardId: z.string().optional(),
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

    // Build where clause based on filter
    const where: {
      userId: string
      date?: { gte: Date; lt?: Date }
      category?: "NEEDS" | "PARTIAL_NEEDS" | "AVOID"
      expenseType?: "EXPECTED" | "UNEXPECTED"
    } = { userId: session.user.id }

    // Add month/year filter (takes precedence over period)
    if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 1)
      where.date = { gte: startDate, lt: endDate }
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

      where.date = { gte: startDate }
    }

    if (filter !== "all") {
      if (["NEEDS", "PARTIAL_NEEDS", "AVOID"].includes(filter)) {
        where.category = filter as "NEEDS" | "PARTIAL_NEEDS" | "AVOID"
      } else if (["EXPECTED", "UNEXPECTED"].includes(filter)) {
        where.expenseType = filter as "EXPECTED" | "UNEXPECTED"
      }
    }

    // Build orderBy clause
    let orderBy: { date?: "desc" | "asc"; amount?: "desc" | "asc"; title?: "asc"; category?: "asc" } = { date: "desc" }
    if (sortBy === "amount") {
      orderBy = { amount: "desc" }
    } else if (sortBy === "title") {
      orderBy = { title: "asc" }
    } else if (sortBy === "category") {
      orderBy = { category: "asc" }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        date: true,
        title: true,
        expenseType: true,
        category: true,
        amount: true,
        needsPortion: true,
        avoidPortion: true,
        paymentMethod: true,
        paymentDueDate: true,
        creditCard: {
          select: {
            cardName: true,
            bank: true,
            lastFourDigits: true,
            billingCycle: true,
            dueDate: true,
          }
        },
        createdAt: true,
      },
    })

    // Calculate summary with the same filter
    const allExpenses = await prisma.expense.findMany({
      where,
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

    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        date: new Date(validatedData.date),
        title: validatedData.title,
        expenseType: validatedData.expenseType,
        category: validatedData.category,
        amount: validatedData.amount,
        needsPortion: validatedData.needsPortion || null,
        avoidPortion: validatedData.avoidPortion || null,
        paymentMethod: validatedData.paymentMethod,
        creditCardId: validatedData.creditCardId || null,
        paymentDueDate: paymentDueDate,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Expense creation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}