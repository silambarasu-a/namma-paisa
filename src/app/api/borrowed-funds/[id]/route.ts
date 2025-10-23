import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"

const updateBorrowedFundSchema = z.object({
  memberId: z.string().optional(),
  lenderName: z.string().min(1).optional(),
  borrowedAmount: z.number().positive().optional(),
  borrowedDate: z.string().optional(),
  expectedReturnDate: z.string().optional().nullable(),
  investedInHoldingId: z.string().optional().nullable(),
  transactionIds: z.array(z.string()).optional(),
  sipExecutionIds: z.array(z.string()).optional(),
  currentValue: z.number().optional().nullable(),
  profitLoss: z.number().optional().nullable(),
  purpose: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  interestRate: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const borrowedFund = await prisma.borrowedFund.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        member: true,
        investedInHolding: true,
      },
    })

    if (!borrowedFund) {
      return NextResponse.json(
        { error: "Borrowed fund not found" },
        { status: 404 }
      )
    }

    // Transform Decimal types
    const transformed = {
      ...borrowedFund,
      borrowedAmount: Number(borrowedFund.borrowedAmount),
      returnedAmount: Number(borrowedFund.returnedAmount),
      investedAmount: Number(borrowedFund.investedAmount),
      surplusAmount: Number(borrowedFund.surplusAmount),
      currentValue: borrowedFund.currentValue
        ? Number(borrowedFund.currentValue)
        : null,
      profitLoss: borrowedFund.profitLoss ? Number(borrowedFund.profitLoss) : null,
      interestRate: borrowedFund.interestRate
        ? Number(borrowedFund.interestRate)
        : null,
      member: borrowedFund.member
        ? {
            ...borrowedFund.member,
            currentBalance: Number(borrowedFund.member.currentBalance),
            extraSpent: Number(borrowedFund.member.extraSpent),
            extraOwe: Number(borrowedFund.member.extraOwe),
          }
        : null,
      investedInHolding: borrowedFund.investedInHolding
        ? {
            ...borrowedFund.investedInHolding,
            qty: Number(borrowedFund.investedInHolding.qty),
            avgCost: Number(borrowedFund.investedInHolding.avgCost),
            currentPrice: borrowedFund.investedInHolding.currentPrice
              ? Number(borrowedFund.investedInHolding.currentPrice)
              : null,
          }
        : null,
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error("Error fetching borrowed fund:", error)
    return NextResponse.json(
      { error: "Failed to fetch borrowed fund" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const borrowedFund = await prisma.borrowedFund.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!borrowedFund) {
      return NextResponse.json(
        { error: "Borrowed fund not found" },
        { status: 404 }
      )
    }

    const body = await req.json()
    const validatedData = updateBorrowedFundSchema.parse(body)

    // Validate month not closed if borrowedDate is being updated
    if (validatedData.borrowedDate) {
      const borrowedDate = new Date(validatedData.borrowedDate)
      await validateMonthNotClosed(
        session.user.id,
        borrowedDate,
        "update borrowed fund"
      )
    }

    // Verify member exists if being updated
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

    // Verify holding exists if being updated
    if (validatedData.investedInHoldingId !== undefined && validatedData.investedInHoldingId !== null) {
      const holding = await prisma.holding.findFirst({
        where: {
          id: validatedData.investedInHoldingId,
          userId: session.user.id,
        },
      })

      if (!holding) {
        return NextResponse.json(
          { error: "Holding not found" },
          { status: 404 }
        )
      }
    }

    // Recalculate invested and surplus amounts if transactionIds or borrowedAmount are being updated
    const transactionIds = validatedData.transactionIds ?? borrowedFund.transactionIds
    const borrowedAmount = validatedData.borrowedAmount ?? Number(borrowedFund.borrowedAmount)

    let investedAmount = 0
    if (transactionIds.length > 0) {
      const transactions = await prisma.transaction.findMany({
        where: {
          id: { in: transactionIds },
          userId: session.user.id,
        },
      })
      investedAmount = transactions.reduce(
        (sum, txn) => sum + Number(txn.amountInr || txn.amount),
        0
      )
    }

    const surplusAmount = borrowedAmount - investedAmount

    const updated = await prisma.borrowedFund.update({
      where: { id },
      data: {
        ...(validatedData.memberId && { memberId: validatedData.memberId }),
        ...(validatedData.lenderName && { lenderName: validatedData.lenderName }),
        ...(validatedData.borrowedAmount && {
          borrowedAmount: validatedData.borrowedAmount,
        }),
        ...(validatedData.borrowedDate && {
          borrowedDate: new Date(validatedData.borrowedDate),
        }),
        ...(validatedData.expectedReturnDate !== undefined && {
          expectedReturnDate: validatedData.expectedReturnDate
            ? new Date(validatedData.expectedReturnDate)
            : null,
        }),
        ...(validatedData.investedInHoldingId !== undefined && {
          investedInHoldingId: validatedData.investedInHoldingId,
        }),
        ...(validatedData.transactionIds && {
          transactionIds: validatedData.transactionIds,
        }),
        ...(validatedData.sipExecutionIds && {
          sipExecutionIds: validatedData.sipExecutionIds,
        }),
        // Always update invested and surplus amounts when recalculated
        investedAmount,
        surplusAmount,
        ...(validatedData.currentValue !== undefined && {
          currentValue: validatedData.currentValue,
        }),
        ...(validatedData.profitLoss !== undefined && {
          profitLoss: validatedData.profitLoss,
        }),
        ...(validatedData.purpose !== undefined && { purpose: validatedData.purpose }),
        ...(validatedData.terms !== undefined && { terms: validatedData.terms }),
        ...(validatedData.interestRate !== undefined && {
          interestRate: validatedData.interestRate,
        }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
      include: {
        member: true,
        investedInHolding: true,
      },
    })

    // Transform Decimal types
    const transformed = {
      ...updated,
      borrowedAmount: Number(updated.borrowedAmount),
      returnedAmount: Number(updated.returnedAmount),
      investedAmount: Number(updated.investedAmount),
      surplusAmount: Number(updated.surplusAmount),
      currentValue: updated.currentValue ? Number(updated.currentValue) : null,
      profitLoss: updated.profitLoss ? Number(updated.profitLoss) : null,
      interestRate: updated.interestRate ? Number(updated.interestRate) : null,
      member: updated.member
        ? {
            ...updated.member,
            currentBalance: Number(updated.member.currentBalance),
            extraSpent: Number(updated.member.extraSpent),
            extraOwe: Number(updated.member.extraOwe),
          }
        : null,
      investedInHolding: updated.investedInHolding
        ? {
            ...updated.investedInHolding,
            qty: Number(updated.investedInHolding.qty),
            avgCost: Number(updated.investedInHolding.avgCost),
            currentPrice: updated.investedInHolding.currentPrice
              ? Number(updated.investedInHolding.currentPrice)
              : null,
          }
        : null,
    }

    return NextResponse.json(transformed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating borrowed fund:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update borrowed fund" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const borrowedFund = await prisma.borrowedFund.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!borrowedFund) {
      return NextResponse.json(
        { error: "Borrowed fund not found" },
        { status: 404 }
      )
    }

    // Validate month not closed for borrowed date
    await validateMonthNotClosed(
      session.user.id,
      borrowedFund.borrowedDate,
      "delete borrowed fund"
    )

    await prisma.borrowedFund.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Borrowed fund deleted successfully" })
  } catch (error) {
    console.error("Error deleting borrowed fund:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete borrowed fund" },
      { status: 500 }
    )
  }
}
