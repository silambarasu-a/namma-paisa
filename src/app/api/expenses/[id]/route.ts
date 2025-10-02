import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculatePaymentDueDate } from "@/lib/credit-card-utils"

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
  if (data.paymentMethod === "CARD" && !data.creditCardId) {
    return false
  }
  return true
}, {
  message: "Credit card must be selected when payment method is CARD",
})

// Update expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validatedData = expenseSchema.parse(body)

    // Check if expense belongs to user
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existingExpense || existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    // Calculate payment due date if credit card
    let paymentDueDate = null
    if (validatedData.paymentMethod === "CARD" && validatedData.creditCardId) {
      const creditCard = await prisma.creditCard.findUnique({
        where: { id: validatedData.creditCardId },
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

    // Update expense
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        date: new Date(validatedData.date),
        title: validatedData.title,
        description: validatedData.description || null,
        expenseType: validatedData.expenseType,
        category: validatedData.category,
        amount: validatedData.amount,
        needsPortion: validatedData.needsPortion,
        avoidPortion: validatedData.avoidPortion,
        paymentMethod: validatedData.paymentMethod,
        creditCardId: validatedData.creditCardId || null,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      },
    })

    return NextResponse.json(expense, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating expense:", error)
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    )
  }
}

// Delete expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if expense belongs to user
    const expense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!expense || expense.userId !== session.user.id) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    )
  }
}