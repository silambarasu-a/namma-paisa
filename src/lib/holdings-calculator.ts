import { prisma } from "@/lib/prisma"

/**
 * Fetch real-time prices for holdings without updating database
 */
async function fetchCurrentPrices(userId: string): Promise<Record<string, number>> {
  try {
    const holdings = await prisma.holding.findMany({
      where: {
        userId,
        qty: { gt: 0 },
        bucket: { not: "EMERGENCY_FUND" }
      },
    })

    const pricePromises = holdings.map(async (holding) => {
      try {
        const price = await fetchPrice(holding.symbol, holding.bucket, holding.currency)
        return { id: holding.id, price }
      } catch {
        return { id: holding.id, price: null }
      }
    })

    const prices = await Promise.all(pricePromises)

    return prices.reduce((acc, item) => {
      if (item.price !== null) {
        acc[item.id] = item.price
      }
      return acc
    }, {} as Record<string, number>)
  } catch {
    return {}
  }
}

/**
 * Calculate holdings value with fresh prices
 */
export async function getHoldingsValueWithFreshPrices(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: {
      userId,
      qty: { gt: 0 }
    },
  })

  // Fetch current prices
  const currentPrices = await fetchCurrentPrices(userId)

  let totalCurrentValue = 0
  let totalInvestment = 0

  const getInrValue = (holding: typeof holdings[0], usdAmount: number) => {
    if (holding.currency === "USD" && holding.usdInrRate) {
      return usdAmount * Number(holding.usdInrRate)
    }
    return usdAmount
  }

  holdings.forEach(holding => {
    const qty = Number(holding.qty)
    const avgCost = Number(holding.avgCost)

    // Use fresh price if available, otherwise fall back to DB price or avgCost
    const freshPrice = currentPrices[holding.id]
    const currentPrice = freshPrice ?? (holding.currentPrice ? Number(holding.currentPrice) : avgCost)

    const costAmount = qty * avgCost
    const currentAmount = qty * currentPrice

    totalInvestment += getInrValue(holding, costAmount)
    totalCurrentValue += getInrValue(holding, currentAmount)
  })

  const totalPL = totalCurrentValue - totalInvestment

  return {
    count: holdings.length,
    totalInvestment,
    totalCurrentValue,
    totalPL,
  }
}

// Price fetching functions
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
  } catch {
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
