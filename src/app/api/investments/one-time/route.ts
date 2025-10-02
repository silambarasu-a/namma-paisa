import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const purchaseSchema = z.object({
  bucket: z.enum(["MUTUAL_FUND", "IND_STOCK", "US_STOCK", "CRYPTO", "EMERGENCY_FUND"]),
  symbol: z.string().min(1, "Symbol is required"),
  name: z.string().min(1, "Name is required"),
  qty: z.number().positive("Quantity must be positive"),
  buyPrice: z.number().positive("Buy price must be positive"),
  date: z.string(),
  description: z.string().optional(),
  currency: z.string().optional().default("INR"),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return all holdings since one-time purchases are now part of holdings
    const holdings = await prisma.holding.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(holdings)
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
    const data = purchaseSchema.parse(body)

    const amount = data.qty * data.buyPrice

    // Validate that allocation exists for the bucket
    const allocation = await prisma.investmentAllocation.findFirst({
      where: {
        userId: session.user.id,
        bucket: data.bucket,
      },
    })

    if (!allocation) {
      return NextResponse.json(
        { error: `You must configure allocation for ${data.bucket} bucket first. Go to Investments → Allocations.` },
        { status: 400 }
      )
    }

    // Get user's salary
    const salaryHistory = await prisma.salaryHistory.findFirst({
      where: { userId: session.user.id },
      orderBy: { effectiveFrom: "desc" },
    })

    if (!salaryHistory) {
      return NextResponse.json(
        { error: "Please configure your salary first" },
        { status: 400 }
      )
    }

    // Calculate available for investment
    const taxSetting = await prisma.taxSetting.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    let taxAmount = 0
    if (taxSetting) {
      const monthly = Number(salaryHistory.monthly)
      switch (taxSetting.mode) {
        case "PERCENTAGE":
          taxAmount = taxSetting.percentage ? (monthly * Number(taxSetting.percentage)) / 100 : 0
          break
        case "FIXED":
          taxAmount = taxSetting.fixedAmount ? Number(taxSetting.fixedAmount) : 0
          break
        case "HYBRID":
          const percentageAmount = taxSetting.percentage ? (monthly * Number(taxSetting.percentage)) / 100 : 0
          taxAmount = percentageAmount + (taxSetting.fixedAmount ? Number(taxSetting.fixedAmount) : 0)
          break
      }
    }

    const afterTax = Number(salaryHistory.monthly) - taxAmount

    // Get active loans
    const now = new Date()
    const activeLoans = await prisma.loan.findMany({
      where: {
        userId: session.user.id,
        startDate: { lte: new Date(now.getFullYear(), now.getMonth() + 1, 0) },
      },
    })

    let totalLoanEMI = 0
    for (const loan of activeLoans) {
      const startDate = new Date(loan.startDate)
      const loanStartMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthsSinceStart = (currentMonth.getFullYear() - loanStartMonth.getFullYear()) * 12 +
                                (currentMonth.getMonth() - loanStartMonth.getMonth())
      if (monthsSinceStart >= 0 && monthsSinceStart < loan.tenure) {
        totalLoanEMI += Number(loan.emiAmount)
      }
    }

    const availableForInvestment = afterTax - totalLoanEMI

    // Calculate bucket allocation
    let bucketAllocation = 0
    if (allocation.allocationType === "PERCENTAGE" && allocation.percent) {
      bucketAllocation = (availableForInvestment * Number(allocation.percent)) / 100
    } else if (allocation.allocationType === "AMOUNT" && allocation.customAmount) {
      bucketAllocation = Number(allocation.customAmount)
    }

    // Get existing SIPs in this bucket
    const existingSIPs = await prisma.sIP.findMany({
      where: {
        userId: session.user.id,
        bucket: data.bucket,
        isActive: true,
      },
    })

    let totalExistingSIPAmount = 0
    for (const sip of existingSIPs) {
      let sipMonthlyAmount = Number(sip.amount)
      if (sip.frequency === "YEARLY") {
        sipMonthlyAmount = sipMonthlyAmount / 12
      }
      totalExistingSIPAmount += sipMonthlyAmount
    }

    // Calculate available for one-time
    const availableForOneTime = bucketAllocation - totalExistingSIPAmount

    // Check if amount would exceed allocation
    if (amount > availableForOneTime) {
      return NextResponse.json(
        {
          error: `Cannot add purchase. ${data.bucket} bucket has ₹${availableForOneTime.toLocaleString()} available for one-time investments, but you're trying to invest ₹${amount.toLocaleString()}.`
        },
        { status: 400 }
      )
    }

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

    // Fetch current price
    let currentPrice: number | null = null
    try {
      currentPrice = await fetchPrice(data.symbol, data.bucket, data.currency)
    } catch (error) {
      console.error("Failed to fetch current price:", error)
      // Continue without current price
    }

    let holding
    if (existingHolding) {
      // Calculate weighted average cost
      const oldQty = Number(existingHolding.qty)
      const oldAvgCost = Number(existingHolding.avgCost)
      const newQty = data.qty
      const newBuyPrice = data.buyPrice

      const totalQty = oldQty + newQty
      const newAvgCost = (oldQty * oldAvgCost + newQty * newBuyPrice) / totalQty

      console.log(`Updating holding: oldQty=${oldQty}, oldAvgCost=${oldAvgCost}, newQty=${newQty}, newBuyPrice=${newBuyPrice}`)
      console.log(`New values: totalQty=${totalQty}, newAvgCost=${newAvgCost}`)

      // Update existing holding
      holding = await prisma.holding.update({
        where: { id: existingHolding.id },
        data: {
          qty: totalQty,
          avgCost: newAvgCost,
          currentPrice: currentPrice,
          updatedAt: new Date(),
        },
      })
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
          avgCost: data.buyPrice,
          currentPrice: currentPrice,
          currency: data.currency || "INR",
        },
      })
    }

    return NextResponse.json(holding, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }
    console.error("Error creating one-time purchase:", error)
    return NextResponse.json(
      { error: "Failed to create purchase" },
      { status: 500 }
    )
  }
}

// Fetch price based on bucket type
async function fetchPrice(symbol: string, bucket: string, currency: string = "INR"): Promise<number | null> {
  try {
    switch (bucket) {
      case "MUTUAL_FUND":
        return await getMutualFundPrice(symbol)
      case "IND_STOCK":
        return await getStockPrice(symbol, "IN")
      case "US_STOCK":
        return await getStockPrice(symbol, "US")
      case "CRYPTO":
        return await getCryptoPrice(symbol, currency)
      default:
        return null
    }
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error)
    return null
  }
}

async function getMutualFundPrice(schemeCode: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 0 }
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const latestNav = parseFloat(data.data[0].nav)
      return isNaN(latestNav) ? null : latestNav
    }

    return null
  } catch {
    return null
  }
}

async function getStockPrice(symbol: string, market: string): Promise<number | null> {
  try {
    const tickerSymbol = market === "IN" && !symbol.includes(".") ? `${symbol}.NS` : symbol

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${tickerSymbol}?interval=1d&range=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 0 }
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    const quote = data?.chart?.result?.[0]?.meta?.regularMarketPrice

    return quote ? parseFloat(quote) : null
  } catch {
    return null
  }
}

async function getCryptoPrice(cryptoId: string, currency: string = "INR"): Promise<number | null> {
  try {
    const coinId = cryptoId.toLowerCase()
    const vsCurrency = currency === "USD" ? "usd" : "inr"

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}`,
      { next: { revalidate: 0 } }
    )

    if (!response.ok) return null

    const data = await response.json()
    const price = data?.[coinId]?.[vsCurrency]

    return price ? parseFloat(price) : null
  } catch {
    return null
  }
}
