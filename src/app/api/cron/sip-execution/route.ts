import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma"

type SIPWithUser = Prisma.SIPGetPayload<{
  include: { user: true }
}>

/**
 * SIP Execution Cron Job
 * Should be called daily to execute pending SIPs
 *
 * This endpoint:
 * 1. Finds all active SIPs that should be executed today
 * 2. For each SIP:
 *    - Fetches current price
 *    - Calculates quantity based on SIP amount
 *    - Updates or creates holding
 *    - Creates transaction record
 *    - Creates SIP execution record
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    console.log(`[SIP Cron] Running SIP execution for ${today.toISOString()}`)

    // Find all active SIPs
    const activeSIPs = await prisma.sIP.findMany({
      where: {
        isActive: true,
        startDate: { lte: today },
        OR: [
          { endDate: null },
          { endDate: { gte: today } },
        ],
      },
      include: {
        user: true,
      },
    })

    console.log(`[SIP Cron] Found ${activeSIPs.length} active SIPs`)

    const results = {
      total: activeSIPs.length,
      executed: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const sip of activeSIPs) {
      try {
        // Determine if this SIP should execute today
        let shouldExecute = false

        if (sip.frequency === "MONTHLY") {
          // Execute on the start date's day of month
          const startDay = new Date(sip.startDate).getDate()
          shouldExecute = currentDay === startDay
        } else if (sip.frequency === "YEARLY") {
          // Execute on the start date's day and month
          const startDate = new Date(sip.startDate)
          shouldExecute =
            currentDay === startDate.getDate() &&
            currentMonth === startDate.getMonth()
        } else if (sip.frequency === "CUSTOM") {
          // Execute on custom day
          shouldExecute = sip.customDay === currentDay
        }

        if (!shouldExecute) {
          results.skipped++
          continue
        }

        // Check if already executed today
        const existingExecution = await prisma.sIPExecution.findFirst({
          where: {
            sipId: sip.id,
            executionDate: {
              gte: new Date(currentYear, currentMonth, currentDay, 0, 0, 0),
              lt: new Date(currentYear, currentMonth, currentDay, 23, 59, 59),
            },
          },
        })

        if (existingExecution) {
          console.log(`[SIP Cron] SIP ${sip.id} already executed today, skipping`)
          results.skipped++
          continue
        }

        // Execute the SIP
        await executeSIP(sip)
        results.executed++

        console.log(`[SIP Cron] Successfully executed SIP ${sip.id} for user ${sip.userId}`)
      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.errors.push(`SIP ${sip.id}: ${errorMessage}`)
        console.error(`[SIP Cron] Failed to execute SIP ${sip.id}:`, error)

        // Create failed execution record
        await prisma.sIPExecution.create({
          data: {
            sipId: sip.id,
            userId: sip.userId,
            executionDate: today,
            amount: sip.amount,
            status: "FAILED",
            errorMessage,
          },
        })
      }
    }

    console.log(`[SIP Cron] Execution complete:`, results)

    return NextResponse.json({
      success: true,
      message: "SIP execution completed",
      ...results,
    })
  } catch (error) {
    console.error("[SIP Cron] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Failed to execute SIPs",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function executeSIP(sip: SIPWithUser) {
  const { id: sipId, userId, bucket, symbol, name, amount } = sip

  // If no bucket/symbol specified, just record execution without holding update
  if (!bucket || !symbol) {
    await prisma.sIPExecution.create({
      data: {
        sipId,
        userId,
        executionDate: new Date(),
        amount,
        status: "SUCCESS",
      },
    })
    return
  }

  // Fetch current price
  let currentPrice: number | null = null
  try {
    currentPrice = await fetchPrice(symbol, bucket)
  } catch (error) {
    console.error(`[SIP Cron] Failed to fetch price for ${symbol}:`, error)
    throw new Error(`Failed to fetch price for ${symbol}`)
  }

  if (!currentPrice) {
    throw new Error(`No price available for ${symbol}`)
  }

  // Calculate quantity
  const qty = Number(amount) / currentPrice

  // Normalize symbol
  const normalizedSymbol = symbol.trim().toUpperCase()

  // Find or create holding
  const existingHolding = await prisma.holding.findFirst({
    where: {
      userId,
      bucket,
      symbol: {
        equals: normalizedSymbol,
        mode: 'insensitive',
      },
    },
  })

  let holding
  if (existingHolding) {
    // Update existing holding with weighted average
    const oldQty = Number(existingHolding.qty)
    const oldAvgCost = Number(existingHolding.avgCost)
    const newQty = qty
    const newAvgCost = currentPrice

    const totalQty = oldQty + newQty
    const weightedAvgCost = (oldQty * oldAvgCost + newQty * newAvgCost) / totalQty

    holding = await prisma.holding.update({
      where: { id: existingHolding.id },
      data: {
        qty: totalQty,
        avgCost: weightedAvgCost,
        currentPrice,
        updatedAt: new Date(),
      },
    })
  } else {
    // Create new holding
    holding = await prisma.holding.create({
      data: {
        userId,
        bucket,
        symbol: normalizedSymbol,
        name: name || symbol,
        qty,
        avgCost: currentPrice,
        currentPrice,
        currency: "INR",
        isManual: false,
      },
    })
  }

  // Create transaction record
  await prisma.transaction.create({
    data: {
      userId,
      holdingId: holding.id,
      bucket,
      symbol: normalizedSymbol,
      name: name || symbol,
      qty,
      price: currentPrice,
      amount: Number(amount),
      transactionType: "SIP_EXECUTION",
      purchaseDate: new Date(),
      description: `SIP execution for ${name || symbol}`,
    },
  })

  // Create SIP execution record
  await prisma.sIPExecution.create({
    data: {
      sipId,
      userId,
      holdingId: holding.id,
      executionDate: new Date(),
      amount,
      qty,
      price: currentPrice,
      status: "SUCCESS",
    },
  })
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
  } catch {
    return null
  }
}
