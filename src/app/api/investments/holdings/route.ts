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
  usdInrRate: z.number().positive().optional(),
  isManual: z.boolean().optional().default(false),
  purchaseDate: z.string().optional(),
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

    // Normalize symbol for consistent matching (trim and uppercase)
    const normalizedSymbol = data.symbol.trim().toUpperCase()

    // Check if holding already exists for this user + bucket + symbol
    const existingHolding = await prisma.holding.findFirst({
      where: {
        userId: session.user.id,
        bucket: data.bucket,
        symbol: {
          equals: normalizedSymbol,
          mode: 'insensitive',
        },
      },
    })

    console.log(`Checking for existing holding: bucket=${data.bucket}, symbol=${normalizedSymbol}`)
    console.log(`Found existing holding:`, existingHolding ? `Yes (id: ${existingHolding.id})` : 'No')

    let holding
    if (existingHolding) {
      // Calculate weighted average cost
      const oldQty = Number(existingHolding.qty)
      const oldAvgCost = Number(existingHolding.avgCost)
      const newQty = data.qty
      const newAvgCost = data.avgCost

      const totalQty = oldQty + newQty
      const weightedAvgCost = (oldQty * oldAvgCost + newQty * newAvgCost) / totalQty

      // Calculate weighted average USD-INR rate if applicable
      let weightedUsdInrRate = existingHolding.usdInrRate ? Number(existingHolding.usdInrRate) : null
      if (data.bucket === "US_STOCK" && data.currency === "USD" && data.usdInrRate) {
        const oldRate = existingHolding.usdInrRate ? Number(existingHolding.usdInrRate) : data.usdInrRate
        const oldInvestment = oldQty * oldAvgCost
        const newInvestment = newQty * newAvgCost
        const totalInvestment = oldInvestment + newInvestment
        weightedUsdInrRate = (oldInvestment * oldRate + newInvestment * data.usdInrRate) / totalInvestment
      }

      console.log(`Updating holding: oldQty=${oldQty}, oldAvgCost=${oldAvgCost}, newQty=${newQty}, newAvgCost=${newAvgCost}`)
      console.log(`New values: totalQty=${totalQty}, weightedAvgCost=${weightedAvgCost}, weightedUsdInrRate=${weightedUsdInrRate}`)

      // Update existing holding with weighted average
      holding = await prisma.holding.update({
        where: { id: existingHolding.id },
        data: {
          qty: totalQty,
          avgCost: weightedAvgCost,
          currentPrice: data.currentPrice || existingHolding.currentPrice,
          usdInrRate: weightedUsdInrRate,
          isManual: data.isManual,
          updatedAt: new Date(),
        },
      })

      console.log(`Holding updated successfully`)
    } else {
      console.log(`Creating new holding for symbol: ${normalizedSymbol}`)
      // Create new holding
      holding = await prisma.holding.create({
        data: {
          userId: session.user.id,
          bucket: data.bucket,
          symbol: normalizedSymbol,
          name: data.name,
          qty: data.qty,
          avgCost: data.avgCost,
          currentPrice: data.currentPrice || null,
          currency: data.currency || "INR",
          usdInrRate: data.usdInrRate || null,
          isManual: data.isManual,
        },
      })

      console.log(`Holding created successfully`)
    }

    // Track transaction if not manual entry
    if (!data.isManual) {
      const transactionAmount = data.qty * data.avgCost
      let amountInr: number | null = null

      // Calculate amountInr for USD transactions
      if (data.currency === "USD" && data.usdInrRate) {
        amountInr = transactionAmount * data.usdInrRate
      }

      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          holdingId: holding.id,
          bucket: data.bucket,
          symbol: normalizedSymbol,
          name: data.name,
          qty: data.qty,
          price: data.avgCost,
          amount: transactionAmount,
          currency: data.currency || "INR",
          amountInr: amountInr,
          transactionType: "MANUAL_ENTRY",
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          usdInrRate: data.usdInrRate || null,
        },
      })
    }

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