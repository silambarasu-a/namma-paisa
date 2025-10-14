import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Prisma } from "@/generated/prisma"

const memberTransactionSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  transactionType: z.enum(["GAVE", "OWE", "EXPENSE_PAID_FOR_THEM", "EXPENSE_PAID_BY_THEM"]),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  description: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId") || null
    const isSettled = searchParams.get("isSettled")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: {
      userId: string
      memberId?: string
      isSettled?: boolean
    } = { userId: session.user.id }

    if (memberId) {
      where.memberId = memberId
    }

    if (isSettled !== null) {
      where.isSettled = isSettled === "true"
    }

    const transactions = await prisma.memberTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        expense: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
      },
    })

    // Convert Decimal to number
    const formattedTransactions = transactions.map((txn) => ({
      ...txn,
      amount: Number(txn.amount),
    }))

    // Calculate summary
    const summary = formattedTransactions.reduce(
      (acc, txn) => {
        acc.totalTransactions += 1

        if (!txn.isSettled) {
          acc.unsettledCount += 1

          // GAVE and EXPENSE_PAID_FOR_THEM means they owe you
          if (txn.transactionType === "GAVE" || txn.transactionType === "EXPENSE_PAID_FOR_THEM") {
            acc.totalOwedToYou += txn.amount
          }
          // OWE and EXPENSE_PAID_BY_THEM means you owe them
          else if (txn.transactionType === "OWE" || txn.transactionType === "EXPENSE_PAID_BY_THEM") {
            acc.totalYouOwe += txn.amount
          }
        } else {
          acc.settledCount += 1
        }

        return acc
      },
      {
        totalTransactions: 0,
        totalOwedToYou: 0,
        totalYouOwe: 0,
        settledCount: 0,
        unsettledCount: 0,
        netBalance: 0,
      }
    )

    summary.netBalance = summary.totalOwedToYou - summary.totalYouOwe

    return NextResponse.json({ transactions: formattedTransactions, summary })
  } catch (error) {
    console.error("Member transactions fetch error:", error)
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
    const validatedData = memberTransactionSchema.parse(body)

    // Check if member exists and belongs to user
    const member = await prisma.member.findFirst({
      where: {
        id: validatedData.memberId,
        userId: session.user.id,
      },
    })

    if (!member) {
      return NextResponse.json(
        { message: "Member not found" },
        { status: 404 }
      )
    }

    // Create transaction and update member balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.memberTransaction.create({
        data: {
          userId: session.user.id,
          memberId: validatedData.memberId,
          transactionType: validatedData.transactionType,
          amount: validatedData.amount,
          date: new Date(validatedData.date),
          description: validatedData.description || null,
          paymentMethod: validatedData.paymentMethod || null,
        },
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

      // Update member balance
      // GAVE and EXPENSE_PAID_FOR_THEM: Increase balance (they owe you more)
      // OWE and EXPENSE_PAID_BY_THEM: Decrease balance (you owe them more)
      let balanceChange = new Prisma.Decimal(0)

      if (validatedData.transactionType === "GAVE" || validatedData.transactionType === "EXPENSE_PAID_FOR_THEM") {
        balanceChange = new Prisma.Decimal(validatedData.amount)
      } else if (validatedData.transactionType === "OWE" || validatedData.transactionType === "EXPENSE_PAID_BY_THEM") {
        balanceChange = new Prisma.Decimal(validatedData.amount).negated()
      }

      await tx.member.update({
        where: { id: validatedData.memberId },
        data: {
          currentBalance: {
            increment: balanceChange,
          },
        },
      })

      return transaction
    })

    return NextResponse.json(
      {
        ...result,
        amount: Number(result.amount),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Member transaction creation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
