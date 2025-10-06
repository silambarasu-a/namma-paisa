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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    // const authHeader = _request.headers.get("authorization")
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

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

        if (sip.frequency === "DAILY") {
          // Execute every day
          shouldExecute = true
        } else if (sip.frequency === "WEEKLY") {
          // Execute once a week on the same day as start date
          const startDate = new Date(sip.startDate)
          const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          shouldExecute = daysSinceStart % 7 === 0
        } else if (sip.frequency === "MONTHLY") {
          // Execute on the start date's day of month
          const startDay = new Date(sip.startDate).getDate()
          shouldExecute = currentDay >= startDay
        } else if (sip.frequency === "QUARTERLY") {
          // Execute every 3 months on the start date's day
          const startDate = new Date(sip.startDate)
          const monthsSinceStart = (currentYear - startDate.getFullYear()) * 12 + (currentMonth - startDate.getMonth())
          shouldExecute = monthsSinceStart % 3 === 0 && currentDay >= startDate.getDate()
        } else if (sip.frequency === "HALF_YEARLY") {
          // Execute every 6 months on the start date's day
          const startDate = new Date(sip.startDate)
          const monthsSinceStart = (currentYear - startDate.getFullYear()) * 12 + (currentMonth - startDate.getMonth())
          shouldExecute = monthsSinceStart % 6 === 0 && currentDay >= startDate.getDate()
        } else if (sip.frequency === "YEARLY") {
          // Execute on the start date's day and month
          const startDate = new Date(sip.startDate)
          shouldExecute =
            currentDay >= startDate.getDate() &&
            currentMonth >= startDate.getMonth()
        } else if (sip.frequency === "CUSTOM") {
          // Execute on custom day
          shouldExecute = sip.customDay ? sip.customDay <= currentDay : false
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
            status: { not: "FAILED" }
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
        // Calculate amount based on currency and amountInINR
        let failedAmount = Number(sip.amount)
        let failedAmountInr: number | null = null

        if (sip.currency === "USD" && sip.amountInINR) {
          // Amount is in INR, but we can't convert without exchange rate
          // Just store the INR amount in amountInr
          failedAmountInr = Number(sip.amount)
          failedAmount = 0 // We don't know the USD amount without exchange rate
        } else if (sip.currency === "USD" && !sip.amountInINR) {
          // Amount is in USD
          failedAmount = Number(sip.amount)
        } else {
          // INR
          failedAmount = Number(sip.amount)
        }

        await prisma.sIPExecution.create({
          data: {
            sipId: sip.id,
            userId: sip.userId,
            executionDate: today,
            amount: failedAmount,
            currency: sip.currency || "INR",
            amountInr: failedAmountInr,
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
  const {
    id: sipId,
    userId,
    bucket,
    symbol,
    name,
    amount,
    currency,
    amountInINR,
  } = sip

  // If no bucket/symbol specified, just record execution without a holding update
  if (!bucket || !symbol) {
    // Calculate amount based on currency and amountInINR for record-keeping
    let executionAmount = Number(amount)
    let executionAmountInr: number | null = null

    if (currency === "USD" && amountInINR) {
      executionAmountInr = Number(amount)
      executionAmount = 0 // No conversion without exchange rate
    } else if (currency === "USD" && !amountInINR) {
      executionAmount = Number(amount)
    } else {
      executionAmount = Number(amount)
    }

    await prisma.sIPExecution.create({
      data: {
        sipId,
        userId,
        executionDate: new Date(),
        amount: executionAmount,
        currency: currency || "INR",
        amountInr: executionAmountInr,
        status: "SUCCESS",
      },
    })
    return
  }

  // Fetch USD/INR exchange rate only if the asset currency is USD
  let usdInrRate: number | null = null
  if (currency === "USD") {
    try {
      const rateResponse = await fetch("https://api.exchangerate-api.com/v4/latest/USD")
      if (!rateResponse.ok) throw new Error(`Exchange rate API responded with status: ${rateResponse.status}`)
      const rateData = await rateResponse.json()
      usdInrRate = rateData?.rates?.INR
      if (!usdInrRate) throw new Error("INR rate not found in response")
    } catch (error) {
      console.error(`[SIP Cron] Failed to fetch USD/INR rate:`, error)
      throw new Error(`Failed to fetch USD/INR exchange rate`)
    }
  }

  // Fetch current price (assumed in the asset's native currency; i.e., USD for US assets, INR for INR assets)
  let currentPrice: number | null = null
  try {
    currentPrice = await fetchPrice(symbol, bucket)
  } catch (error) {
    console.error(`[SIP Cron] Failed to fetch price for ${symbol}:`, error)
    throw new Error(`Failed to fetch price for ${symbol}`)
  }
  if (!currentPrice) throw new Error(`No price available for ${symbol}`)

  // Calculate quantity
  // Keep price in the holding's currency (USD for USD assets, INR otherwise)
  let qty: number
  if (currency === "USD") {
    if (!usdInrRate) throw new Error("Missing USD/INR rate for USD asset")

    if (amountInINR) {
      // Amount is in INR; convert to USD then divide by USD price
      const amountUSD = Number(amount) / usdInrRate
      qty = amountUSD / currentPrice
    } else {
      // Amount is already in USD
      qty = Number(amount) / currentPrice
    }
  } else {
    // Non-USD (e.g., INR) assets: assume amount and price are in the same currency (INR)
    qty = Number(amount) / currentPrice
  }

  // Normalize symbol
  const normalizedSymbol = symbol.trim().toUpperCase()

  // Find existing holding (case-insensitive symbol match)
  const existingHolding = await prisma.holding.findFirst({
    where: {
      userId,
      bucket,
      symbol: { equals: normalizedSymbol, mode: "insensitive" },
    },
  })

  // Helper: compute qty-weighted USD/INR rate (only when amountInINR is true)
  const computeQtyWeightedUsdInr = (
    oldQty: number,
    oldRate: number | null,
    newQty: number,
    newRate: number
  ): number => {
    if (oldQty <= 0 || !oldRate) return newRate
    return (oldQty * oldRate + newQty * newRate) / (oldQty + newQty)
  }

  let holding
  if (existingHolding) {
    // Update existing holding with weighted average cost (in holding currency)
    const oldQty = Number(existingHolding.qty)
    const oldAvgCost = Number(existingHolding.avgCost)
    const newQty = qty

    const totalQty = oldQty + newQty
    const weightedAvgCost = (oldQty * oldAvgCost + newQty * currentPrice) / totalQty

    // Update USD/INR rate ONLY for USD assets where the SIP amount is in INR
    let updatedUsdInrRate: number | null = existingHolding.usdInrRate ? Number(existingHolding.usdInrRate) : null
    if (currency === "USD" && amountInINR && usdInrRate) {
      updatedUsdInrRate = computeQtyWeightedUsdInr(oldQty, updatedUsdInrRate, newQty, usdInrRate)
    }

    holding = await prisma.holding.update({
      where: { id: existingHolding.id },
      data: {
        qty: totalQty,
        avgCost: weightedAvgCost,        // stays in holding currency (USD for USD assets)
        currentPrice: currentPrice,      // stays in holding currency
        currency: currency || "INR",
        usdInrRate: currency === "USD" ? updatedUsdInrRate : null,
        updatedAt: new Date(),
      },
    })
  } else {
    // Create new holding
    // For USD assets: store avgCost/currentPrice in USD; set usdInrRate only when the SIP amount is in INR
    const initialUsdInrRate =
      currency === "USD" && amountInINR ? usdInrRate ?? null : null

    holding = await prisma.holding.create({
      data: {
        userId,
        bucket,
        symbol: normalizedSymbol,
        name: name || symbol,
        qty,
        avgCost: currentPrice,           // holding currency
        currentPrice: currentPrice,      // holding currency
        currency: currency || "INR",
        usdInrRate: initialUsdInrRate,
        isManual: false,
      },
    })
  }

  // Create transaction record (price in holding currency)
  // Calculate transaction amount and amountInr based on currency and amountInINR
  let transactionAmount: number
  let transactionAmountInr: number | null = null

  if (currency === "USD") {
    // usdInrRate should always be set for USD assets (we fetch it above and throw if not available)
    if (!usdInrRate) throw new Error("USD/INR rate is required for USD transactions")

    if (amountInINR) {
      // SIP amount is in INR, convert to USD for transaction amount
      transactionAmount = Number(amount) / usdInrRate
      transactionAmountInr = Number(amount)  // Original INR amount
    } else {
      // SIP amount is in USD
      transactionAmount = Number(amount)
      transactionAmountInr = Number(amount) * usdInrRate
    }
  } else {
    // INR or other currency
    transactionAmount = Number(amount)
    transactionAmountInr = null
  }

  await prisma.transaction.create({
    data: {
      userId,
      holdingId: holding.id,
      bucket,
      symbol: normalizedSymbol,
      name: name || symbol,
      qty,
      price: currentPrice,                               // holding currency (USD for USD assets)
      amount: transactionAmount,                         // Amount in asset's currency
      currency: currency || "INR",
      amountInr: transactionAmountInr,                   // Amount in INR (for USD transactions)
      transactionType: "SIP_EXECUTION",
      purchaseDate: new Date(),
      description: `SIP execution for ${name || symbol}`,
      usdInrRate: currency === "USD" && usdInrRate ? usdInrRate : null,
    },
  })

  // Create SIP execution record (price in holding currency)
  await prisma.sIPExecution.create({
    data: {
      sipId,
      userId,
      holdingId: holding.id,
      executionDate: new Date(),
      amount: transactionAmount,                         // Amount in asset's currency
      currency: currency || "INR",
      amountInr: transactionAmountInr,                   // Amount in INR (for USD SIPs)
      qty,
      price: currentPrice,                               // holding currency (USD for USD assets)
      status: "SUCCESS",
      usdInrRate: currency === "USD" && usdInrRate ? usdInrRate : null,
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
