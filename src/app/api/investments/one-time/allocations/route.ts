import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { convertToMonthlyAmount } from "@/lib/frequency-utils"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all allocations
    const allocations = await prisma.investmentAllocation.findMany({
      where: { userId: session.user.id },
    })

    if (allocations.length === 0) {
      return NextResponse.json([])
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

    // Get all active SIPs by bucket
    const activeSIPs = await prisma.sIP.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    })

    // Calculate SIP amounts by bucket
    const sipsByBucket: Record<string, number> = {}
    for (const sip of activeSIPs) {
      const bucket = sip.bucket || "MUTUAL_FUND"
      if (!sipsByBucket[bucket]) {
        sipsByBucket[bucket] = 0
      }
      const sipMonthlyAmount = convertToMonthlyAmount(Number(sip.amount), sip.frequency)
      sipsByBucket[bucket] += sipMonthlyAmount
    }

    // Calculate available for each bucket
    const result = allocations.map(allocation => {
      let bucketAllocation = 0
      if (allocation.allocationType === "PERCENTAGE" && allocation.percent) {
        bucketAllocation = (availableForInvestment * Number(allocation.percent)) / 100
      } else if (allocation.allocationType === "AMOUNT" && allocation.customAmount) {
        bucketAllocation = Number(allocation.customAmount)
      }

      const existingSIPs = sipsByBucket[allocation.bucket] || 0
      const availableForOneTime = bucketAllocation - existingSIPs

      return {
        bucket: allocation.bucket,
        totalAllocation: Math.round(bucketAllocation * 100) / 100,
        existingSIPs: Math.round(existingSIPs * 100) / 100,
        availableForOneTime: Math.round(availableForOneTime * 100) / 100,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching one-time allocations:", error)
    return NextResponse.json(
      { error: "Failed to fetch allocations" },
      { status: 500 }
    )
  }
}
