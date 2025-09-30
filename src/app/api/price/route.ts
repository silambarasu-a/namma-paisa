import { NextResponse } from "next/server"

// Fetch real-time prices for different asset types
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol") || ""
    const bucket = searchParams.get("bucket") || ""

    if (!symbol || !bucket) {
      return NextResponse.json({ error: "Symbol and bucket are required" }, { status: 400 })
    }

    let price: number | null = null

    try {
      switch (bucket) {
        case "MUTUAL_FUND":
          price = await getMutualFundPrice(symbol)
          break
        case "IND_STOCK":
          price = await getStockPrice(symbol, "IN")
          break
        case "US_STOCK":
          price = await getStockPrice(symbol, "US")
          break
        case "CRYPTO":
          price = await getCryptoPrice(symbol)
          break
        case "EMERGENCY_FUND":
          // Emergency fund doesn't need price updates
          price = null
          break
        default:
          return NextResponse.json({ error: "Invalid bucket type" }, { status: 400 })
      }

      return NextResponse.json({ price, symbol, bucket })
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
      return NextResponse.json({ price: null, error: "Could not fetch price" }, { status: 200 })
    }
  } catch (error) {
    console.error("Error in price API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Fetch mutual fund NAV from MFApi
async function getMutualFundPrice(schemeCode: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`MFApi responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Get latest NAV
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const latestNav = parseFloat(data.data[0].nav)
      return isNaN(latestNav) ? null : latestNav
    }

    return null
  } catch (error) {
    console.error("Error fetching mutual fund price:", error)
    return null
  }
}

// Fetch stock price from Yahoo Finance
async function getStockPrice(symbol: string, market: string): Promise<number | null> {
  try {
    // For Indian stocks, ensure .NS suffix
    const tickerSymbol = market === "IN" && !symbol.includes(".") ? `${symbol}.NS` : symbol

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${tickerSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const quote = data?.chart?.result?.[0]?.meta?.regularMarketPrice

    return quote ? parseFloat(quote) : null
  } catch (error) {
    console.error("Error fetching stock price:", error)
    return null
  }
}

// Fetch crypto price from CoinGecko
async function getCryptoPrice(cryptoId: string): Promise<number | null> {
  try {
    // Convert symbol to CoinGecko ID if needed
    const coinId = cryptoId.toLowerCase()

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=inr`,
      {
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const price = data?.[coinId]?.inr

    return price ? parseFloat(price) : null
  } catch (error) {
    console.error("Error fetching crypto price:", error)
    return null
  }
}