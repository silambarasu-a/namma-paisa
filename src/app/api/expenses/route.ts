import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

    // Build where clause based on filter
    let where: any = { userId: session.user.id }

    if (filter !== "all") {
      if (["NEEDS", "PARTIAL_NEEDS", "AVOID"].includes(filter)) {
        where.category = filter
      } else if (["EXPECTED", "UNEXPECTED"].includes(filter)) {
        where.expenseType = filter
      }
    }

    // Build orderBy clause
    let orderBy: any = { date: "desc" }
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
        createdAt: true,
      },
    })

    // Calculate summary
    const allExpenses = await prisma.expense.findMany({
      where: { userId: session.user.id },
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
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.issues },
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