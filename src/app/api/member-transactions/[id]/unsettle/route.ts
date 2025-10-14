import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.memberTransaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }

    if (!existingTransaction.isSettled) {
      return NextResponse.json(
        { message: "Transaction is not settled" },
        { status: 400 }
      )
    }

    // Unsettle transaction and reverse changes
    await prisma.$transaction(async (tx) => {
      const settledAmount = existingTransaction.settledAmount
        ? Number(existingTransaction.settledAmount)
        : Number(existingTransaction.amount)
      const originalAmount = Number(existingTransaction.amount)
      const difference = settledAmount - originalAmount

      // Reverse member balance change (add back the transaction effect)
      let balanceChange = new Prisma.Decimal(0)

      if (
        existingTransaction.transactionType === "GAVE" ||
        existingTransaction.transactionType === "EXPENSE_PAID_FOR_THEM"
      ) {
        balanceChange = new Prisma.Decimal(existingTransaction.amount)
      } else if (
        existingTransaction.transactionType === "OWE" ||
        existingTransaction.transactionType === "EXPENSE_PAID_BY_THEM"
      ) {
        balanceChange = new Prisma.Decimal(existingTransaction.amount).negated()
      }

      await tx.member.update({
        where: { id: existingTransaction.memberId },
        data: {
          currentBalance: {
            increment: balanceChange,
          },
        },
      })

      // Delete linked settlement income/expense if exists
      if (existingTransaction.settlementIncomeId) {
        await tx.income.delete({
          where: { id: existingTransaction.settlementIncomeId },
        })
      }

      if (existingTransaction.settlementExpenseId) {
        await tx.expense.delete({
          where: { id: existingTransaction.settlementExpenseId },
        })
      }

      // Reverse member's extra spent/owe if there was a difference
      if (difference !== 0) {
        const absDifference = Math.abs(difference)
        let memberExtraField: 'extraSpent' | 'extraOwe' | null = null

        if (existingTransaction.transactionType === "GAVE" || existingTransaction.transactionType === "EXPENSE_PAID_FOR_THEM") {
          memberExtraField = difference > 0 ? 'extraOwe' : 'extraSpent'
        } else {
          memberExtraField = difference > 0 ? 'extraSpent' : 'extraOwe'
        }

        if (memberExtraField) {
          await tx.member.update({
            where: { id: existingTransaction.memberId },
            data: {
              [memberExtraField]: {
                decrement: new Prisma.Decimal(absDifference)
              }
            },
          })
        }
      }

      // Unsettle the transaction
      await tx.memberTransaction.update({
        where: { id },
        data: {
          isSettled: false,
          settledDate: null,
          settledAmount: null,
          settledNotes: null,
          settlementIncomeId: null,
          settlementExpenseId: null,
        },
      })
    })

    return NextResponse.json({ message: "Transaction unsettled successfully" })
  } catch (error) {
    console.error("Transaction unsettle error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
