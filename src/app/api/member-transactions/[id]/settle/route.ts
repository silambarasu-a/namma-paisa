import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Prisma } from "@/generated/prisma"

const settleSchema = z.object({
  settledAmount: z.number().positive().optional(), // Custom settlement amount
  settledNotes: z.string().optional(),
})

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
    const body = await request.json()
    const validatedData = settleSchema.parse(body)

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

    if (existingTransaction.isSettled) {
      return NextResponse.json(
        { message: "Transaction is already settled" },
        { status: 400 }
      )
    }

    // Settle transaction and update member balance
    const result = await prisma.$transaction(async (tx) => {
      const originalAmount = Number(existingTransaction.amount)
      const settledAmount = validatedData.settledAmount || originalAmount
      const difference = settledAmount - originalAmount

      // Calculate balance change (reverse the transaction effect)
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

      // Handle settlement difference - create income/expense records
      let createdIncomeId: string | null = null
      let createdExpenseId: string | null = null
      let memberExtraField: 'extraSpent' | 'extraOwe' | null = null
      let extraAmount = 0
      let memberName = ""

      if (difference !== 0) {
        // Get member name first
        const member = await tx.member.findUnique({
          where: { id: existingTransaction.memberId },
          select: { name: true },
        })
        memberName = member?.name || "Member"

        const transactionDate = new Date()
        const absDifference = Math.abs(difference)
        extraAmount = absDifference

        // Determine if difference should be income or expense
        let isIncome = false
        let description = ""

        if (existingTransaction.transactionType === "GAVE" || existingTransaction.transactionType === "EXPENSE_PAID_FOR_THEM") {
          // They owed you, now settling
          if (difference > 0) {
            // They gave MORE than they owed -> Additional Income
            isIncome = true
            memberExtraField = 'extraOwe' // They owe you extra
            description = `Extra amount received from ${memberName} during settlement (₹${absDifference.toFixed(2)} more than owed)`
          } else {
            // They gave LESS than they owed -> Loss (Expense)
            isIncome = false
            memberExtraField = 'extraSpent' // You waived off (loss)
            description = `Amount waived off for ${memberName} during settlement (₹${absDifference.toFixed(2)} less received)`
          }
        } else {
          // You owed them, now settling
          if (difference > 0) {
            // You paid MORE than you owed -> Expense
            isIncome = false
            memberExtraField = 'extraSpent' // You spent extra
            description = `Extra amount paid to ${memberName} during settlement (₹${absDifference.toFixed(2)} more than owed)`
          } else {
            // You paid LESS than you owed -> Waived off (Income)
            isIncome = true
            memberExtraField = 'extraOwe' // They waived off (you benefit)
            description = `Amount waived off by ${memberName} during settlement (₹${absDifference.toFixed(2)} less paid)`
          }
        }

        if (isIncome) {
          // Create additional income
          const income = await tx.income.create({
            data: {
              userId: session.user.id,
              date: transactionDate,
              title: `Settlement difference - ${memberName}`,
              description,
              amount: new Prisma.Decimal(absDifference),
              category: "Settlement",
              isRecurring: false,
            },
          })
          createdIncomeId = income.id
        } else {
          // Create additional expense
          const expense = await tx.expense.create({
            data: {
              userId: session.user.id,
              date: transactionDate,
              title: `Settlement difference - ${memberName}`,
              description,
              expenseType: "UNEXPECTED",
              category: "AVOID",
              amount: new Prisma.Decimal(absDifference),
              paymentMethod: "OTHER",
            },
          })
          createdExpenseId = expense.id
        }
      }

      // Single transaction update with all data
      const transactionUpdateData: Prisma.MemberTransactionUpdateInput = {
        isSettled: true,
        settledDate: new Date(),
        settledNotes: validatedData.settledNotes || null,
      }

      if (validatedData.settledAmount) {
        transactionUpdateData.settledAmount = new Prisma.Decimal(settledAmount)
      }

      if (createdIncomeId) {
        transactionUpdateData.settlementIncomeId = createdIncomeId
      }

      if (createdExpenseId) {
        transactionUpdateData.settlementExpenseId = createdExpenseId
      }

      const transaction = await tx.memberTransaction.update({
        where: { id },
        data: transactionUpdateData,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      })

      // Single member update: combine balance change + extra fields
      const memberUpdateData: Prisma.MemberUpdateInput = {
        currentBalance: {
          increment: balanceChange,
        },
      }

      // Add extra field update if needed
      if (memberExtraField && extraAmount > 0) {
        memberUpdateData[memberExtraField] = {
          increment: new Prisma.Decimal(extraAmount)
        }
      }

      await tx.member.update({
        where: { id: existingTransaction.memberId },
        data: memberUpdateData,
      })

      return transaction
    })

    return NextResponse.json({
      ...result,
      amount: Number(result.amount),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Transaction settle error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
