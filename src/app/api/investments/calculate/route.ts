import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const calculateSchema = z.object({
  netMonthly: z.number().positive("Net monthly income must be positive"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { netMonthly } = calculateSchema.parse(body)

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
            taxAmount = (netMonthly * Number(taxSetting.percentage)) / 100
          }
          break
        case "FIXED":
          if (taxSetting.fixedAmount) {
            taxAmount = Number(taxSetting.fixedAmount)
          }
          break
        case "HYBRID":
          if (taxSetting.percentage && taxSetting.fixedAmount) {
            const percentageAmount = (netMonthly * Number(taxSetting.percentage)) / 100
            taxAmount = percentageAmount + Number(taxSetting.fixedAmount)
          }
          break
      }
    }

    const afterTax = netMonthly - taxAmount

    // Get active SIPs for the current month
    const now = new Date()
    const activeSIPs = await prisma.sIP.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        startDate: {
          lte: now,
        },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
    })

    // Calculate total SIP amount for current month
    let totalSIPAmount = 0
    for (const sip of activeSIPs) {
      const sipAmount = Number(sip.amount)

      switch (sip.frequency) {
        case "MONTHLY":
          totalSIPAmount += sipAmount
          break
        case "YEARLY":
          // Check if this is the month when yearly SIP should be deducted
          const startDate = new Date(sip.startDate)
          if (startDate.getMonth() === now.getMonth()) {
            totalSIPAmount += sipAmount / 12 // Distribute yearly amount across months
          }
          break
        case "CUSTOM":
          // Check if today matches the custom day
          if (sip.customDay && now.getDate() === sip.customDay) {
            totalSIPAmount += sipAmount
          }
          break
      }
    }

    // Get active loans for the current month
    // Include loans that start in the current or previous months
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
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

    const afterSIPs = afterTax - totalSIPAmount
    const afterLoans = afterSIPs - totalLoanEMI
    const availableForInvestment = Math.max(0, afterLoans)

    // Calculate breakdown
    const breakdown = {
      grossIncome: netMonthly,
      taxAmount,
      taxPercentage: netMonthly > 0 ? (taxAmount / netMonthly) * 100 : 0,
      afterTax,
      sipCount: activeSIPs.length,
      totalSIPAmount,
      afterSIPs,
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
      sips: activeSIPs.map((sip) => ({
        id: sip.id,
        name: sip.name,
        amount: Number(sip.amount),
        frequency: sip.frequency,
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