import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const allocationItemSchema = z.object({
  bucket: z.enum(["MUTUAL_FUND", "IND_STOCK", "US_STOCK", "CRYPTO", "EMERGENCY_FUND"]),
  percent: z.number().min(0).max(100),
})

const allocationsSchema = z.array(allocationItemSchema).refine(
  (allocations) => {
    const total = allocations.reduce((sum, item) => sum + item.percent, 0)
    return total <= 100.01
  },
  {
    message: "Total allocation cannot exceed 100%",
  }
)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allocations = await prisma.investmentAllocation.findMany({
      where: { userId: session.user.id },
      orderBy: { bucket: "asc" },
    })

    return NextResponse.json(allocations)
  } catch (error) {
    console.error("Error fetching investment allocations:", error)
    return NextResponse.json(
      { error: "Failed to fetch investment allocations" },
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
    const allocations = allocationsSchema.parse(body)

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing allocations for the user
      await tx.investmentAllocation.deleteMany({
        where: { userId: session.user.id },
      })

      // Create new allocations
      const created = await Promise.all(
        allocations.map((allocation) =>
          tx.investmentAllocation.create({
            data: {
              userId: session.user.id,
              bucket: allocation.bucket,
              percent: allocation.percent,
            },
          })
        )
      )

      return created
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error creating investment allocations:", error)
    return NextResponse.json(
      { error: "Failed to create investment allocations" },
      { status: 500 }
    )
  }
}