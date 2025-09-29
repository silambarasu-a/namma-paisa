import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const holdingSchema = z.object({
  bucket: z.enum(["MUTUAL_FUND", "IND_STOCK", "US_STOCK", "CRYPTO", "EMERGENCY_FUND"]),
  symbol: z.string().min(1, "Symbol is required"),
  name: z.string().min(1, "Name is required"),
  qty: z.number().positive("Quantity must be positive"),
  avgCost: z.number().positive("Average cost must be positive"),
  currentPrice: z.number().positive("Current price must be positive").optional(),
  currency: z.string().optional().default("INR"),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const holdings = await prisma.holding.findMany({
      where: { userId: session.user.id },
      orderBy: [{ bucket: "asc" }, { name: "asc" }],
    })

    // Group holdings by bucket
    const groupedHoldings = holdings.reduce((acc, holding) => {
      const bucket = holding.bucket
      if (!acc[bucket]) {
        acc[bucket] = []
      }

      // Calculate investment value and current value
      const qty = Number(holding.qty)
      const avgCost = Number(holding.avgCost)
      const currentPrice = holding.currentPrice ? Number(holding.currentPrice) : avgCost

      const investmentValue = qty * avgCost
      const currentValue = qty * currentPrice
      const gainLoss = currentValue - investmentValue
      const gainLossPercent = investmentValue > 0 ? (gainLoss / investmentValue) * 100 : 0

      acc[bucket].push({
        ...holding,
        qty: Number(holding.qty),
        avgCost: Number(holding.avgCost),
        currentPrice: holding.currentPrice ? Number(holding.currentPrice) : null,
        investmentValue,
        currentValue,
        gainLoss,
        gainLossPercent,
      })

      return acc
    }, {} as Record<string, Array<{
      id: string;
      bucket: string;
      symbol: string;
      name: string;
      qty: number;
      avgCost: number;
      currentPrice: number | null;
      investmentValue: number;
      currentValue: number;
      gainLoss: number;
      gainLossPercent: number;
      userId: string;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
    }>>)

    // Calculate totals for each bucket
    const summary = Object.entries(groupedHoldings).map(([bucket, holdings]) => {
      const totalInvestment = holdings.reduce((sum, h) => sum + h.investmentValue, 0)
      const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0)
      const totalGainLoss = totalCurrent - totalInvestment
      const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0

      return {
        bucket,
        holdings,
        totalInvestment,
        totalCurrent,
        totalGainLoss,
        totalGainLossPercent,
        count: holdings.length,
      }
    })

    return NextResponse.json({
      holdings: groupedHoldings,
      summary,
    })
  } catch (error) {
    console.error("Error fetching holdings:", error)
    return NextResponse.json(
      { error: "Failed to fetch holdings" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = holdingSchema.parse(body)

    const holding = await prisma.holding.create({
      data: {
        userId: session.user.id,
        bucket: data.bucket,
        symbol: data.symbol,
        name: data.name,
        qty: data.qty,
        avgCost: data.avgCost,
        currentPrice: data.currentPrice || null,
        currency: data.currency || "INR",
      },
    })

    return NextResponse.json(holding, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error creating holding:", error)
    return NextResponse.json(
      { error: "Failed to create holding" },
      { status: 500 }
    )
  }
}