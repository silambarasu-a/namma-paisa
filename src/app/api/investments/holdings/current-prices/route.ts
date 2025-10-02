import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Fetch current prices for all holdings without updating the database
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all holdings for the user
    const holdings = await prisma.holding.findMany({
      where: {
        userId: session.user.id,
        bucket: {
          not: "EMERGENCY_FUND" // Skip emergency fund
        }
      },
    })

    // Fetch current prices for all holdings
    const pricePromises = holdings.map(async (holding) => {
      try {
        const price = await fetchPrice(holding.symbol, holding.bucket, holding.currency)
        return {
          id: holding.id,
          symbol: holding.symbol,
          currentPrice: price,
        }
      } catch (error) {
        console.error(`Error fetching price for ${holding.symbol}:`, error)
        return {
          id: holding.id,
          symbol: holding.symbol,
          currentPrice: null,
        }
      }
    })

    const prices = await Promise.all(pricePromises)

    // Create a map of holding id to current price
    const priceMap = prices.reduce((acc, item) => {
      if (item.currentPrice !== null) {
        acc[item.id] = item.currentPrice
      }
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({ prices: priceMap })
  } catch (error) {
    console.error("Error fetching current prices:", error)
    return NextResponse.json(
      { error: "Failed to fetch current prices" },
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
