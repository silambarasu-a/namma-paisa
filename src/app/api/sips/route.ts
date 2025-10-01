import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const sipSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(["MONTHLY", "YEARLY", "CUSTOM"]),
  customDay: z.number().int().min(1).max(31).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  bucket: z.enum(["MUTUAL_FUND", "IND_STOCK", "US_STOCK", "CRYPTO", "EMERGENCY_FUND"]).optional(),
  symbol: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sips = await prisma.sIP.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(sips)
  } catch (error) {
    console.error("Error fetching SIPs:", error)
    return NextResponse.json(
      { error: "Failed to fetch SIPs" },
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
    const data = sipSchema.parse(body)

    // Validate customDay for CUSTOM frequency
    if (data.frequency === "CUSTOM" && !data.customDay) {
      return NextResponse.json(
        { error: "customDay is required for CUSTOM frequency" },
        { status: 400 }
      )
    }

    // Validate that allocation exists for the bucket
    if (data.bucket) {
      const allocation = await prisma.investmentAllocation.findFirst({
        where: {
          userId: session.user.id,
          bucket: data.bucket,
        },
      })

      if (!allocation) {
        return NextResponse.json(
          { error: `You must configure allocation for ${data.bucket} bucket before adding SIPs. Go to Investments → Allocations to set it up.` },
          { status: 400 }
        )
      }

      // Calculate available amount in this bucket
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
          bucket: data.bucket,
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

      // Calculate monthly amount for new SIP
      let newSIPMonthlyAmount = data.amount
      if (data.frequency === "YEARLY") {
        newSIPMonthlyAmount = data.amount / 12
      }

      // Check if adding this SIP would exceed the bucket allocation
      const totalAfterNewSIP = totalExistingSIPAmount + newSIPMonthlyAmount
      if (totalAfterNewSIP > bucketAllocation) {
        const available = bucketAllocation - totalExistingSIPAmount
        return NextResponse.json(
          {
            error: `Cannot add SIP. ${data.bucket} bucket allocation is ₹${bucketAllocation.toLocaleString()} but you already have ₹${totalExistingSIPAmount.toLocaleString()} in SIPs. Only ₹${available.toLocaleString()} available.`
          },
          { status: 400 }
        )
      }
    }

    const sip = await prisma.sIP.create({
      data: {
        ...data,
        userId: session.user.id,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })

    return NextResponse.json(sip, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error creating SIP:", error)
    return NextResponse.json(
      { error: "Failed to create SIP" },
      { status: 500 }
    )
  }
}