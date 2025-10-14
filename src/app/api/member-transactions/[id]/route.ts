import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const transaction = await prisma.memberTransaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            category: true,
            currentBalance: true,
          },
        },
        expense: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
      member: {
        ...transaction.member,
        currentBalance: Number(transaction.member.currentBalance),
      },
      expense: transaction.expense
        ? {
            ...transaction.expense,
            amount: Number(transaction.expense.amount),
            needsPortion: transaction.expense.needsPortion ? Number(transaction.expense.needsPortion) : null,
            avoidPortion: transaction.expense.avoidPortion ? Number(transaction.expense.avoidPortion) : null,
          }
        : null,
    })
  } catch (error) {
    console.error("Member transaction fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Cannot delete if already settled
    if (existingTransaction.isSettled) {
      return NextResponse.json(
        { message: "Cannot delete a settled transaction" },
        { status: 400 }
      )
    }

    // Delete transaction and update member balance in a transaction
    await prisma.$transaction(async (tx) => {
      // Calculate balance change (reverse of creation)
      let balanceChange = new Prisma.Decimal(0)

      if (
        existingTransaction.transactionType === "GAVE" ||
        existingTransaction.transactionType === "EXPENSE_PAID_FOR_THEM"
      ) {
        balanceChange = new Prisma.Decimal(existingTransaction.amount).negated()
      } else if (
        existingTransaction.transactionType === "OWE" ||
        existingTransaction.transactionType === "EXPENSE_PAID_BY_THEM"
      ) {
        balanceChange = new Prisma.Decimal(existingTransaction.amount)
      }

      await tx.member.update({
        where: { id: existingTransaction.memberId },
        data: {
          currentBalance: {
            increment: balanceChange,
          },
        },
      })

      await tx.memberTransaction.delete({
        where: { id },
      })
    })

    return NextResponse.json({ message: "Transaction deleted successfully" })
  } catch (error) {
    console.error("Member transaction delete error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
