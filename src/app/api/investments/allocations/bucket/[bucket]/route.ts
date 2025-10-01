import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bucket } = await params

    // Get allocation for this bucket
    const allocation = await prisma.investmentAllocation.findFirst({
      where: {
        userId: session.user.id,
        bucket: bucket as "MUTUAL_FUND" | "IND_STOCK" | "US_STOCK" | "CRYPTO" | "EMERGENCY_FUND",
      },
    })

    if (!allocation) {
      return NextResponse.json(
        { error: "No allocation found for this bucket" },
        { status: 404 }
      )
    }

    // Get user's salary to calculate allocation amount
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

    // Calculate available for investment (after tax & loans)
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

    // Calculate bucket allocation amount
    let bucketAllocation = 0
    if (allocation.allocationType === "PERCENTAGE" && allocation.percent) {
      bucketAllocation = (availableForInvestment * Number(allocation.percent)) / 100
    } else if (allocation.allocationType === "AMOUNT" && allocation.customAmount) {
      bucketAllocation = Number(allocation.customAmount)
    }

    // Get existing SIPs in this bucket
    const existingSIPs = await prisma.sIP.findMany({
      where: {
        userId: session.user.id,
        bucket: bucket as "MUTUAL_FUND" | "IND_STOCK" | "US_STOCK" | "CRYPTO" | "EMERGENCY_FUND",
        isActive: true,
      },
    })

    // Calculate total existing SIP amount in this bucket (monthly equivalent)
    let totalExistingSIPAmount = 0
    for (const sip of existingSIPs) {
      let sipMonthlyAmount = Number(sip.amount)
      if (sip.frequency === "YEARLY") {
        sipMonthlyAmount = sipMonthlyAmount / 12
      }
      totalExistingSIPAmount += sipMonthlyAmount
    }

    const available = bucketAllocation - totalExistingSIPAmount

    return NextResponse.json({
      totalAllocation: Math.round(bucketAllocation * 100) / 100,
      existingSIPs: Math.round(totalExistingSIPAmount * 100) / 100,
      available: Math.round(available * 100) / 100,
    })
  } catch (error) {
    console.error("Error fetching bucket allocation:", error)
    return NextResponse.json(
      { error: "Failed to fetch bucket allocation" },
      { status: 500 }
    )
  }
}
