import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"

const returnFundSchema = z.object({
  returnAmount: z.number().positive("Return amount must be positive"),
  returnDate: z.string(),
  notes: z.string().optional(),
})

export async function POST(
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

    if (borrowedFund.isFullyReturned) {
      return NextResponse.json(
        { error: "Fund is already fully returned" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validatedData = returnFundSchema.parse(body)

    const returnDate = new Date(validatedData.returnDate)

    // Validate month not closed for return date
    await validateMonthNotClosed(
      session.user.id,
      returnDate,
      "record fund return"
    )

    // Calculate new returned amount
    const currentReturned = Number(borrowedFund.returnedAmount)
    const newReturnedAmount = currentReturned + validatedData.returnAmount
    const borrowedAmount = Number(borrowedFund.borrowedAmount)

    // Check if return amount exceeds borrowed amount
    if (newReturnedAmount > borrowedAmount) {
      return NextResponse.json(
        {
          error: `Return amount exceeds remaining balance. Borrowed: ₹${borrowedAmount}, Already Returned: ₹${currentReturned}, Remaining: ₹${borrowedAmount - currentReturned}`,
        },
        { status: 400 }
      )
    }

    // Check if this return completes the fund
    const isFullyReturned = newReturnedAmount >= borrowedAmount

    const updated = await prisma.borrowedFund.update({
      where: { id },
      data: {
        returnedAmount: newReturnedAmount,
        isFullyReturned,
        actualReturnDate: isFullyReturned ? returnDate : borrowedFund.actualReturnDate,
        notes: validatedData.notes
          ? `${borrowedFund.notes || ""}\n[${returnDate.toISOString()}] Returned ₹${validatedData.returnAmount}: ${validatedData.notes}`
          : `${borrowedFund.notes || ""}\n[${returnDate.toISOString()}] Returned ₹${validatedData.returnAmount}`,
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

    return NextResponse.json({
      message: isFullyReturned
        ? "Fund fully returned successfully"
        : "Partial return recorded successfully",
      borrowedFund: transformed,
      remainingBalance: borrowedAmount - newReturnedAmount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error recording return:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record return" },
      { status: 500 }
    )
  }
}
