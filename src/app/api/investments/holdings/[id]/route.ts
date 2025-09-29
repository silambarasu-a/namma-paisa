import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const holdingSchema = z.object({
  bucket: z.enum(["MUTUAL_FUND", "IND_STOCK", "US_STOCK", "CRYPTO", "EMERGENCY_FUND"]),
  symbol: z.string().min(1, "Symbol is required"),
  name: z.string().min(1, "Name is required"),
  qty: z.number().positive("Quantity must be positive"),
  avgCost: z.number().positive("Average cost must be positive"),
  currentPrice: z.number().positive("Current price must be positive").optional(),
  currency: z.string().optional().default("INR"),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const holding = await prisma.holding.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 })
    }

    return NextResponse.json(holding)
  } catch (error) {
    console.error("Error fetching holding:", error)
    return NextResponse.json(
      { error: "Failed to fetch holding" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = holdingSchema.parse(body)

    // Check if holding exists and belongs to user
    const existingHolding = await prisma.holding.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingHolding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 })
    }

    const updatedHolding = await prisma.holding.update({
      where: { id },
      data: {
        bucket: data.bucket,
        symbol: data.symbol,
        name: data.name,
        qty: data.qty,
        avgCost: data.avgCost,
        currentPrice: data.currentPrice || null,
        currency: data.currency || "INR",
      },
    })

    return NextResponse.json(updatedHolding)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error updating holding:", error)
    return NextResponse.json(
      { error: "Failed to update holding" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if holding exists and belongs to user
    const existingHolding = await prisma.holding.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingHolding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 })
    }

    await prisma.holding.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Holding deleted successfully" })
  } catch (error) {
    console.error("Error deleting holding:", error)
    return NextResponse.json(
      { error: "Failed to delete holding" },
      { status: 500 }
    )
  }
}
