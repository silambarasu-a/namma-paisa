import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const taxSettingSchema = z.object({
  mode: z.enum(["PERCENTAGE", "FIXED", "HYBRID"]),
  percentage: z.number().min(0).max(100).optional(),
  fixedAmount: z.number().min(0).optional(),
}).refine((data) => {
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
}, {
  message: "Required fields missing for selected tax mode",
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taxSetting = await prisma.taxSetting.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(taxSetting)
  } catch (error) {
    console.error("Tax settings fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { mode, percentage, fixedAmount } = taxSettingSchema.parse(body)

    // Upsert tax setting (update if exists, create if not)
    const existingTaxSetting = await prisma.taxSetting.findFirst({
      where: { userId: session.user.id },
    })

    const taxSetting = existingTaxSetting
      ? await prisma.taxSetting.update({
          where: { id: existingTaxSetting.id },
          data: {
            mode,
            percentage: percentage || null,
            fixedAmount: fixedAmount || null,
          },
        })
      : await prisma.taxSetting.create({
          data: {
            userId: session.user.id,
            mode,
            percentage: percentage || null,
            fixedAmount: fixedAmount || null,
          },
        })

    return NextResponse.json(taxSetting)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Tax settings update error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}