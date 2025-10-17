import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"

const borrowedFundSchema = z.object({
  memberId: z.string().optional(),
  lenderName: z.string().min(1, "Lender name is required"),
  borrowedAmount: z.number().positive("Borrowed amount must be positive"),
  borrowedDate: z.string(),
  expectedReturnDate: z.string().optional(),
  investedInHoldingId: z.string().optional(),
  transactionIds: z.array(z.string()).optional(),
  sipExecutionIds: z.array(z.string()).optional(),
  currentValue: z.number().optional(),
  profitLoss: z.number().optional(),
  purpose: z.string().optional(),
  terms: z.string().optional(),
  interestRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const borrowedFunds = await prisma.borrowedFund.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        member: true,
        investedInHolding: {
          select: {
            id: true,
            symbol: true,
            name: true,
            bucket: true,
            qty: true,
            avgCost: true,
            currentPrice: true,
          },
        },
      },
      orderBy: [
        { isFullyReturned: "asc" }, // Active funds first
        { borrowedDate: "desc" }, // Most recent first
      ],
    })

    // Transform Decimal types to numbers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedFunds = borrowedFunds.map((fund: any) => ({
      ...fund,
      borrowedAmount: Number(fund.borrowedAmount),
      returnedAmount: Number(fund.returnedAmount),
      currentValue: fund.currentValue ? Number(fund.currentValue) : null,
      profitLoss: fund.profitLoss ? Number(fund.profitLoss) : null,
      interestRate: fund.interestRate ? Number(fund.interestRate) : null,
      member: fund.member
        ? {
            ...fund.member,
            currentBalance: Number(fund.member.currentBalance),
            extraSpent: Number(fund.member.extraSpent),
            extraOwe: Number(fund.member.extraOwe),
          }
        : null,
      investedInHolding: fund.investedInHolding
        ? {
            ...fund.investedInHolding,
            qty: Number(fund.investedInHolding.qty),
            avgCost: Number(fund.investedInHolding.avgCost),
            currentPrice: fund.investedInHolding.currentPrice
              ? Number(fund.investedInHolding.currentPrice)
              : null,
          }
        : null,
    }))

    return NextResponse.json(transformedFunds)
  } catch (error) {
    console.error("Error fetching borrowed funds:", error)
    return NextResponse.json(
      { error: "Failed to fetch borrowed funds" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = borrowedFundSchema.parse(body)

    // Validate month not closed for borrowed date
    const borrowedDate = new Date(validatedData.borrowedDate)
    await validateMonthNotClosed(
      session.user.id,
      borrowedDate,
      "create borrowed fund"
    )

    // If memberId provided, verify it exists and belongs to user
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

    // If investedInHoldingId provided, verify it exists and belongs to user
    if (validatedData.investedInHoldingId) {
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

    const borrowedFund = await prisma.borrowedFund.create({
      data: {
        userId: session.user.id,
        memberId: validatedData.memberId,
        lenderName: validatedData.lenderName,
        borrowedAmount: validatedData.borrowedAmount,
        borrowedDate,
        expectedReturnDate: validatedData.expectedReturnDate
          ? new Date(validatedData.expectedReturnDate)
          : null,
        investedInHoldingId: validatedData.investedInHoldingId,
        transactionIds: validatedData.transactionIds || [],
        sipExecutionIds: validatedData.sipExecutionIds || [],
        currentValue: validatedData.currentValue,
        profitLoss: validatedData.profitLoss,
        purpose: validatedData.purpose,
        terms: validatedData.terms,
        interestRate: validatedData.interestRate,
        notes: validatedData.notes,
      },
      include: {
        member: true,
        investedInHolding: true,
      },
    })

    // Transform Decimal types
    const transformed = {
      ...borrowedFund,
      borrowedAmount: Number(borrowedFund.borrowedAmount),
      returnedAmount: Number(borrowedFund.returnedAmount),
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

    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating borrowed fund:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create borrowed fund" },
      { status: 500 }
    )
  }
}
