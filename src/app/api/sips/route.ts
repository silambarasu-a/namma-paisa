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