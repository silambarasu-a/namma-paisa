import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const calculateRequestSchema = z.object({
  netMonthly: z.number().positive(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = calculateRequestSchema.parse(body)

    // Fetch user's tax settings
    const taxSetting = await prisma.taxSetting.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    if (!taxSetting) {
      return NextResponse.json(
        { error: "Tax settings not found. Please configure your tax settings first." },
        { status: 404 }
      )
    }

    let calculatedTax = 0

    switch (taxSetting.mode) {
      case "PERCENTAGE":
        if (!taxSetting.percentage) {
          return NextResponse.json(
            { error: "Percentage value is missing in tax settings" },
            { status: 400 }
          )
        }
        calculatedTax =
          (data.netMonthly * Number(taxSetting.percentage)) / 100
        break

      case "FIXED":
        if (!taxSetting.fixedAmount) {
          return NextResponse.json(
            { error: "Fixed amount is missing in tax settings" },
            { status: 400 }
          )
        }
        calculatedTax = Number(taxSetting.fixedAmount)
        break

      case "HYBRID":
        if (!taxSetting.percentage || !taxSetting.fixedAmount) {
          return NextResponse.json(
            { error: "Percentage or fixed amount is missing in tax settings" },
            { status: 400 }
          )
        }
        calculatedTax =
          (data.netMonthly * Number(taxSetting.percentage)) / 100 +
          Number(taxSetting.fixedAmount)
        break

      default:
        return NextResponse.json(
          { error: "Invalid tax mode" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      netMonthly: data.netMonthly,
      taxMode: taxSetting.mode,
      percentage: taxSetting.percentage ? Number(taxSetting.percentage) : null,
      fixedAmount: taxSetting.fixedAmount ? Number(taxSetting.fixedAmount) : null,
      calculatedTax: Number(calculatedTax.toFixed(2)),
      netAfterTax: Number((data.netMonthly - calculatedTax).toFixed(2)),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error calculating tax:", error)
    return NextResponse.json(
      { error: "Failed to calculate tax" },
      { status: 500 }
    )
  }
}