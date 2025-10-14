import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
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
      include: {
        memberTransaction: true,
      },
    })

    if (!existingExpense || existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    // Validate that both old and new expense dates are not in closed months
    await validateMonthNotClosed(session.user.id, new Date(existingExpense.date), "edit this expense")
    const newExpenseDate = new Date(validatedData.date)
    await validateMonthNotClosed(session.user.id, newExpenseDate, "change expense date to this month")

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
          { error: "Member not found" },
          { status: 404 }
        )
      }
    }

    // Update expense and handle member transaction changes
    const result = await prisma.$transaction(async (tx) => {
      // Handle member transaction updates
      const hadMemberTransaction = !!existingExpense.memberTransaction
      const needsMemberTransaction = validatedData.memberId && (validatedData.paidByMember || validatedData.paidForMember)

      // If previously had member transaction, reverse it
      if (hadMemberTransaction && existingExpense.memberTransaction) {
        let reverseBalanceChange = new Prisma.Decimal(0)

        if (
          existingExpense.memberTransaction.transactionType === "EXPENSE_PAID_FOR_THEM"
        ) {
          reverseBalanceChange = new Prisma.Decimal(existingExpense.memberTransaction.amount).negated()
        } else if (
          existingExpense.memberTransaction.transactionType === "EXPENSE_PAID_BY_THEM"
        ) {
          reverseBalanceChange = new Prisma.Decimal(existingExpense.memberTransaction.amount)
        }

        await tx.member.update({
          where: { id: existingExpense.memberTransaction.memberId },
          data: {
            currentBalance: {
              increment: reverseBalanceChange,
            },
          },
        })

        await tx.memberTransaction.delete({
          where: { id: existingExpense.memberTransaction.id },
        })
      }

      // Update expense
      const expense = await tx.expense.update({
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
          memberId: validatedData.memberId || null,
          paidByMember: validatedData.paidByMember || false,
          paidForMember: validatedData.paidForMember || false,
        },
      })

      // Create new member transaction if needed
      if (needsMemberTransaction && validatedData.memberId) {
        const transactionType = validatedData.paidForMember
          ? "EXPENSE_PAID_FOR_THEM"
          : "EXPENSE_PAID_BY_THEM"

        let balanceChange = new Prisma.Decimal(0)

        if (validatedData.paidForMember) {
          balanceChange = new Prisma.Decimal(validatedData.amount)
        } else if (validatedData.paidByMember) {
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

    return NextResponse.json(result, { status: 200 })
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
      include: {
        memberTransaction: true,
      },
    })

    if (!expense || expense.userId !== session.user.id) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    // Delete expense and handle member transaction cleanup
    await prisma.$transaction(async (tx) => {
      // If expense has a member transaction, reverse the balance and delete it
      if (expense.memberTransaction) {
        let reverseBalanceChange = new Prisma.Decimal(0)

        if (expense.memberTransaction.transactionType === "EXPENSE_PAID_FOR_THEM") {
          reverseBalanceChange = new Prisma.Decimal(expense.memberTransaction.amount).negated()
        } else if (expense.memberTransaction.transactionType === "EXPENSE_PAID_BY_THEM") {
          reverseBalanceChange = new Prisma.Decimal(expense.memberTransaction.amount)
        }

        await tx.member.update({
          where: { id: expense.memberTransaction.memberId },
          data: {
            currentBalance: {
              increment: reverseBalanceChange,
            },
          },
        })

        await tx.memberTransaction.delete({
          where: { id: expense.memberTransaction.id },
        })
      }

      await tx.expense.delete({
        where: { id },
      })
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