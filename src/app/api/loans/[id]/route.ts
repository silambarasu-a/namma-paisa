import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const loanUpdateSchema = z.object({
  loanType: z
    .enum([
      "HOME_LOAN",
      "CAR_LOAN",
      "PERSONAL_LOAN",
      "EDUCATION_LOAN",
      "BUSINESS_LOAN",
      "GOLD_LOAN",
      "CREDIT_CARD",
      "OTHER",
    ])
    .optional(),
  institution: z.string().min(1).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loan = await prisma.loan.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        emis: {
          orderBy: { dueDate: "asc" },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error("Error fetching loan:", error)
    return NextResponse.json(
      { error: "Failed to fetch loan" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = loanUpdateSchema.parse(body)

    const loan = await prisma.loan.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data,
    })

    if (loan.count === 0) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    const updatedLoan = await prisma.loan.findUnique({
      where: { id },
    })

    return NextResponse.json(updatedLoan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error updating loan:", error)
    return NextResponse.json(
      { error: "Failed to update loan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loan = await prisma.loan.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (loan.count === 0) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting loan:", error)
    return NextResponse.json(
      { error: "Failed to delete loan" },
      { status: 500 }
    )
  }
}