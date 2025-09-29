import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const taxSettingSchema = z
  .object({
    mode: z.enum(["PERCENTAGE", "FIXED", "HYBRID"]),
    percentage: z.number().min(0).max(100).optional(),
    fixedAmount: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "PERCENTAGE" && !data.percentage) {
        return false
      }
      if (data.mode === "FIXED" && !data.fixedAmount) {
        return false
      }
      if (data.mode === "HYBRID" && (!data.percentage || !data.fixedAmount)) {
        return false
      }
      return true
    },
    {
      message:
        "Invalid tax mode configuration. PERCENTAGE requires percentage, FIXED requires fixedAmount, HYBRID requires both.",
    }
  )

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const taxSetting = await prisma.taxSetting.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(taxSetting)
  } catch (error) {
    console.error("Error fetching tax settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch tax settings" },
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
    const data = taxSettingSchema.parse(body)

    // Check if tax setting already exists for this user
    const existingTaxSetting = await prisma.taxSetting.findFirst({
      where: { userId: session.user.id },
    })

    let taxSetting

    if (existingTaxSetting) {
      // Update existing tax setting
      taxSetting = await prisma.taxSetting.update({
        where: { id: existingTaxSetting.id },
        data: {
          mode: data.mode,
          percentage: data.percentage ?? null,
          fixedAmount: data.fixedAmount ?? null,
        },
      })
    } else {
      // Create new tax setting
      taxSetting = await prisma.taxSetting.create({
        data: {
          userId: session.user.id,
          mode: data.mode,
          percentage: data.percentage ?? null,
          fixedAmount: data.fixedAmount ?? null,
        },
      })
    }

    return NextResponse.json(taxSetting, { status: existingTaxSetting ? 200 : 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating/updating tax setting:", error)
    return NextResponse.json(
      { error: "Failed to create/update tax setting" },
      { status: 500 }
    )
  }
}