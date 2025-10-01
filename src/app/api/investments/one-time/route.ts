import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const purchaseSchema = z.object({
  bucket: z.enum(["MUTUAL_FUND", "IND_STOCK", "US_STOCK", "CRYPTO", "EMERGENCY_FUND"]),
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const purchases = await prisma.oneTimePurchase.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error("Error fetching one-time purchases:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = purchaseSchema.parse(body)

    // Validate that allocation exists for the bucket
    const allocation = await prisma.investmentAllocation.findFirst({
      where: {
        userId: session.user.id,
        bucket: data.bucket,
      },
    })

    if (!allocation) {
      return NextResponse.json(
        { error: `You must configure allocation for ${data.bucket} bucket first. Go to Investments → Allocations.` },
        { status: 400 }
      )
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

    // Calculate bucket allocation
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
        bucket: data.bucket,
        isActive: true,
      },
    })

    let totalExistingSIPAmount = 0
    for (const sip of existingSIPs) {
      let sipMonthlyAmount = Number(sip.amount)
      if (sip.frequency === "YEARLY") {
        sipMonthlyAmount = sipMonthlyAmount / 12
      }
      totalExistingSIPAmount += sipMonthlyAmount
    }

    // Get existing one-time purchases in this bucket for current month
    const purchaseDate = new Date(data.date)
    const monthStart = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1)
    const monthEnd = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + 1, 0)

    const existingPurchases = await prisma.oneTimePurchase.findMany({
      where: {
        userId: session.user.id,
        bucket: data.bucket,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    })

    const totalExistingPurchases = existingPurchases.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )

    // Check if total would exceed allocation
    const availableForOneTime = bucketAllocation - totalExistingSIPAmount
    const totalAfterNewPurchase = totalExistingPurchases + data.amount

    if (totalAfterNewPurchase > availableForOneTime) {
      const available = availableForOneTime - totalExistingPurchases
      return NextResponse.json(
        {
          error: `Cannot add purchase. ${data.bucket} bucket has ₹${availableForOneTime.toLocaleString()} available for one-time investments, but you already have ₹${totalExistingPurchases.toLocaleString()} in purchases this month. Only ₹${available.toLocaleString()} remaining.`
        },
        { status: 400 }
      )
    }

    // Create the purchase record
    const purchase = await prisma.oneTimePurchase.create({
      data: {
        userId: session.user.id,
        bucket: data.bucket,
        amount: data.amount,
        date: new Date(data.date),
        description: data.description,
      },
    })

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }
    console.error("Error creating one-time purchase:", error)
    return NextResponse.json(
      { error: "Failed to create purchase" },
      { status: 500 }
    )
  }
}
