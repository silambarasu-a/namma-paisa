import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Refresh current prices for all user holdings and update database
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all holdings for the user
    const holdings = await prisma.holding.findMany({
      where: {
        userId: session.user.id,
        qty: { gt: 0 },
        bucket: {
          not: "EMERGENCY_FUND" // Skip emergency fund
        }
      },
    })

    let updated = 0
    let failed = 0

    // Fetch and update prices for each holding
    for (const holding of holdings) {
      try {
        const price = await fetchPrice(holding.symbol, holding.bucket, holding.currency)

        if (price !== null) {
          await prisma.holding.update({
            where: { id: holding.id },
            data: { currentPrice: price }
          })
          updated++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Error updating price for ${holding.symbol}:`, error)
        failed++
      }
    }

    // Recalculate totals with updated prices
    const updatedHoldings = await prisma.holding.findMany({
      where: {
        userId: session.user.id,
        qty: { gt: 0 }
      },
    })

    let totalCurrentValue = 0
    let totalInvestment = 0

    const getInrValue = (holding: typeof updatedHoldings[0], usdAmount: number) => {
      if (holding.currency === "USD" && holding.usdInrRate) {
        return usdAmount * Number(holding.usdInrRate)
      }
      return usdAmount
    }

    updatedHoldings.forEach(holding => {
      const qty = Number(holding.qty)
      const avgCost = Number(holding.avgCost)
      const currentPrice = holding.currentPrice ? Number(holding.currentPrice) : avgCost

      const costAmount = qty * avgCost
      const currentAmount = qty * currentPrice

      totalInvestment += getInrValue(holding, costAmount)
      totalCurrentValue += getInrValue(holding, currentAmount)
    })

    const totalPL = totalCurrentValue - totalInvestment

    return NextResponse.json({
      success: true,
      updated,
      failed,
      total: holdings.length,
      holdingsData: {
        count: updatedHoldings.length,
        totalInvestment,
        totalCurrentValue,
        totalPL,
      }
    })
  } catch (error) {
    console.error("Error refreshing prices:", error)
    return NextResponse.json(
      { error: "Failed to refresh prices" },
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
      next: { revalidate: 0 } // No cache
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
