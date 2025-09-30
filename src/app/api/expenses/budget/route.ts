import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const budgetSchema = z.object({
  expectedPercent: z.number().min(0).max(100).optional(),
  expectedAmount: z.number().min(0).optional(),
  unexpectedPercent: z.number().min(0).max(100).optional(),
  unexpectedAmount: z.number().min(0).optional(),
}).refine(
  (data) => {
    // At least one field must be provided for expected or unexpected
    const hasExpected = data.expectedPercent !== undefined || data.expectedAmount !== undefined
    const hasUnexpected = data.unexpectedPercent !== undefined || data.unexpectedAmount !== undefined
    return hasExpected || hasUnexpected
  },
  {
    message: "At least one budget allocation must be provided",
  }
)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const budget = await prisma.expenseBudget.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json(budget || {})
  } catch (error) {
    console.error("Error fetching expense budget:", error)
    return NextResponse.json(
      { error: "Failed to fetch expense budget" },
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
    const data = budgetSchema.parse(body)

    const budget = await prisma.expenseBudget.upsert({
      where: { userId: session.user.id },
      update: {
        expectedPercent: data.expectedPercent ?? null,
        expectedAmount: data.expectedAmount ?? null,
        unexpectedPercent: data.unexpectedPercent ?? null,
        unexpectedAmount: data.unexpectedAmount ?? null,
      },
      create: {
        userId: session.user.id,
        expectedPercent: data.expectedPercent ?? null,
        expectedAmount: data.expectedAmount ?? null,
        unexpectedPercent: data.unexpectedPercent ?? null,
        unexpectedAmount: data.unexpectedAmount ?? null,
      },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error saving expense budget:", error)
    return NextResponse.json(
      { error: "Failed to save expense budget" },
      { status: 500 }
    )
  }
}