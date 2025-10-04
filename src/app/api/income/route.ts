import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"

const incomeSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  category: z.string().default("OTHER"),
  isRecurring: z.boolean().default(false),
})

// Get all income records
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    const where: {
      userId: string
      date?: {
        gte: Date
        lte: Date
      }
    } = { userId: session.user.id }

    // Filter by year and month if provided
    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    const incomes = await prisma.income.findMany({
      where,
      orderBy: { date: "desc" },
    })

    // Calculate total
    const total = incomes.reduce((sum, income) => sum + Number(income.amount), 0)

    return NextResponse.json({ incomes, total })
  } catch (error) {
    console.error("Error fetching income:", error)
    return NextResponse.json(
      { error: "Failed to fetch income" },
      { status: 500 }
    )
  }
}

// Create new income
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = incomeSchema.parse(body)

    // Validate that the income date is not in a closed month
    const incomeDate = new Date(validatedData.date)
    await validateMonthNotClosed(session.user.id, incomeDate, "add income")

    const income = await prisma.income.create({
      data: {
        userId: session.user.id,
        date: new Date(validatedData.date),
        title: validatedData.title,
        description: validatedData.description || null,
        amount: validatedData.amount,
        category: validatedData.category,
        isRecurring: validatedData.isRecurring,
      },
    })

    return NextResponse.json(income, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes("month has been closed")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error creating income:", error)
    return NextResponse.json(
      { error: "Failed to create income" },
      { status: 500 }
    )
  }
}
