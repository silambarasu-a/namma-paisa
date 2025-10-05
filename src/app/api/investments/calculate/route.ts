import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { convertToMonthlyAmount, getAmountForMonth } from "@/lib/frequency-utils"

const calculateSchema = z.object({
  monthly: z.number().positive("Net monthly income must be positive"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { monthly } = calculateSchema.parse(body)

    // Get user's tax settings
    const taxSetting = await prisma.taxSetting.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    // Calculate tax amount
    let taxAmount = 0
    if (taxSetting) {
      switch (taxSetting.mode) {
        case "PERCENTAGE":
          if (taxSetting.percentage) {
            taxAmount = (monthly * Number(taxSetting.percentage)) / 100
          }
          break
        case "FIXED":
          if (taxSetting.fixedAmount) {
            taxAmount = Number(taxSetting.fixedAmount)
          }
          break
        case "HYBRID":
          if (taxSetting.percentage && taxSetting.fixedAmount) {
            const percentageAmount = (monthly * Number(taxSetting.percentage)) / 100
            taxAmount = percentageAmount + Number(taxSetting.fixedAmount)
          }
          break
      }
    }

    const afterTax = monthly - taxAmount

    // Get active SIPs for the current month
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get SIPs that are active in the current month (started on or before end of this month)
    const activeSIPs = await prisma.sIP.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        startDate: {
          lte: currentMonthEnd,
        },
        OR: [
          { endDate: null },
          { endDate: { gte: currentMonthStart } },
        ],
      },
    })

    // Get all active SIPs including upcoming ones for display purposes
    const allActiveSIPs = await prisma.sIP.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
    })

    // Calculate total SIP amount for current month
    // Only include SIPs that have started or will start this month
    let totalSIPAmount = 0
    let currentMonthSIPCount = 0

    for (const sip of activeSIPs) {
      const sipStartDate = new Date(sip.startDate)
      const sipAmount = Number(sip.amount)

      // Only count if SIP starts in current month or earlier
      if (sipStartDate <= currentMonthEnd) {
        currentMonthSIPCount++
        const amountForMonth = getAmountForMonth(
          sipAmount,
          sip.frequency,
          sipStartDate,
          now.getMonth(),
          now.getFullYear()
        )
        totalSIPAmount += amountForMonth
      }
    }

    // Get active loans for the current month
    // Include loans that start in the current or previous months
    const activeLoans = await prisma.loan.findMany({
      where: {
        userId: session.user.id,
        startDate: {
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0), // End of current month
        },
      },
    })

    // Calculate total loan EMI for current month
    let totalLoanEMI = 0
    for (const loan of activeLoans) {
      const startDate = new Date(loan.startDate)
      const loanStartMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Calculate months between loan start and now (considering the month, not the day)
      const monthsSinceStart = (currentMonth.getFullYear() - loanStartMonth.getFullYear()) * 12 +
                                (currentMonth.getMonth() - loanStartMonth.getMonth())

      // Check if loan is still active (within tenure)
      // Include loans that start this month or earlier, and haven't completed their tenure
      if (monthsSinceStart >= 0 && monthsSinceStart < loan.tenure) {
        totalLoanEMI += Number(loan.emiAmount)
      }
    }

    // Calculate available for investment (After Tax & Loans, NOT subtracting SIPs)
    // SIPs are part of the allocation, not deducted from available amount
    const afterLoans = afterTax - totalLoanEMI
    const availableForInvestment = Math.max(0, afterLoans)

    // Group SIPs by bucket (use allActiveSIPs to include upcoming SIPs)
    const sipsByBucket: Record<string, { count: number; total: number; sips: Array<{ id: string; name: string; amount: number; frequency: string; bucket: string; symbol: string | null; startDate?: Date | null; isUpcoming: boolean }> }> = {}
    allActiveSIPs.forEach((sip) => {
      const bucket = sip.bucket || "MUTUAL_FUND" // Default to MUTUAL_FUND for backward compatibility
      if (!sipsByBucket[bucket]) {
        sipsByBucket[bucket] = { count: 0, total: 0, sips: [] }
      }

      const sipMonthlyAmount = convertToMonthlyAmount(Number(sip.amount), sip.frequency)

      sipsByBucket[bucket].count += 1
      sipsByBucket[bucket].total += sipMonthlyAmount
      sipsByBucket[bucket].sips.push({
        id: sip.id,
        name: sip.name,
        amount: Number(sip.amount),
        frequency: sip.frequency,
        bucket: sip.bucket || "MUTUAL_FUND",
        symbol: sip.symbol,
        startDate: sip.startDate,
        isUpcoming: new Date(sip.startDate) > now,
      })
    })

    // Calculate breakdown
    const breakdown = {
      grossIncome: monthly,
      taxAmount,
      taxPercentage: monthly > 0 ? (taxAmount / monthly) * 100 : 0,
      afterTax,
      sipCount: currentMonthSIPCount,
      totalSIPAmount,
      loanCount: activeLoans.filter(loan => {
        const startDate = new Date(loan.startDate)
        const loanStartMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthsSinceStart = (currentMonth.getFullYear() - loanStartMonth.getFullYear()) * 12 +
                                  (currentMonth.getMonth() - loanStartMonth.getMonth())
        return monthsSinceStart >= 0 && monthsSinceStart < loan.tenure
      }).length,
      totalLoanEMI,
      afterLoans,
      availableForInvestment,
      sipsByBucket,
      allSips: allActiveSIPs.map((sip) => ({
        id: sip.id,
        name: sip.name,
        amount: Number(sip.amount),
        frequency: sip.frequency,
        bucket: sip.bucket,
        startDate: sip.startDate,
        isUpcoming: new Date(sip.startDate) > now,
      })),
    }

    return NextResponse.json(breakdown)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error calculating investment amount:", error)
    return NextResponse.json(
      { error: "Failed to calculate investment amount" },
      { status: 500 }
    )
  }
}