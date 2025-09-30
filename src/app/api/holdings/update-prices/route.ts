import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Update all holdings with current prices
// This endpoint can be called by a cron job daily
export async function POST(request: Request) {
  try {
    // Optional: Add authentication/API key check for cron job
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Starting daily price update for all holdings...")

    // Fetch all holdings
    const holdings = await prisma.holding.findMany({
      where: {
        bucket: {
          not: "EMERGENCY_FUND" // Skip emergency fund
        }
      }
    })

    let updated = 0
    let failed = 0

    // Update each holding
    for (const holding of holdings) {
      try {
        const price = await fetchPrice(holding.symbol, holding.bucket)

        if (price) {
          await prisma.holding.update({
            where: { id: holding.id },
            data: { currentPrice: price }
          })
          updated++
          console.log(`Updated ${holding.symbol} (${holding.bucket}): ${price}`)
        } else {
          failed++
          console.log(`Failed to fetch price for ${holding.symbol} (${holding.bucket})`)
        }
      } catch (error) {
        failed++
        console.error(`Error updating ${holding.symbol}:`, error)
      }
    }

    console.log(`Price update complete. Updated: ${updated}, Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      updated,
      failed,
      total: holdings.length
    })
  } catch (error) {
    console.error("Error in bulk price update:", error)
    return NextResponse.json(
      { error: "Failed to update prices" },
      { status: 500 }
    )
  }
}

// Fetch price based on bucket type
async function fetchPrice(symbol: string, bucket: string): Promise<number | null> {
  try {
    switch (bucket) {
      case "MUTUAL_FUND":
        return await getMutualFundPrice(symbol)
      case "IND_STOCK":
        return await getStockPrice(symbol, "IN")
      case "US_STOCK":
        return await getStockPrice(symbol, "US")
      case "CRYPTO":
        return await getCryptoPrice(symbol)
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
      next: { revalidate: 0 } // No cache for price updates
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const latestNav = parseFloat(data.data[0].nav)
      return isNaN(latestNav) ? null : latestNav
    }

    return null
  } catch (error) {
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
  } catch (error) {
    return null
  }
}

async function getCryptoPrice(cryptoId: string): Promise<number | null> {
  try {
    const coinId = cryptoId.toLowerCase()

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=inr`,
      { next: { revalidate: 0 } }
    )

    if (!response.ok) return null

    const data = await response.json()
    const price = data?.[coinId]?.inr

    return price ? parseFloat(price) : null
  } catch (error) {
    return null
  }
}

// Allow GET for manual trigger (admin only)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")

    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call POST internally
    return POST(request)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update prices" }, { status: 500 })
  }
}