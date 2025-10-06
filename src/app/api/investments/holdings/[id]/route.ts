import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const holdingSchema = z.object({
  bucket: z.enum(["MUTUAL_FUND", "IND_STOCK", "US_STOCK", "CRYPTO", "EMERGENCY_FUND"]).optional(),
  symbol: z.string().min(1, "Symbol is required").optional(),
  name: z.string().min(1, "Name is required").optional(),
  qty: z.number().positive("Quantity must be positive").optional(),
  avgCost: z.number().positive("Average cost must be positive").optional(),
  currentPrice: z.number().positive("Current price must be positive").optional(),
  currency: z.string().optional(),
  isManual: z.boolean().optional(),
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

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (data.bucket !== undefined) updateData.bucket = data.bucket
    if (data.symbol !== undefined) updateData.symbol = data.symbol
    if (data.name !== undefined) updateData.name = data.name
    if (data.qty !== undefined) updateData.qty = data.qty
    if (data.avgCost !== undefined) updateData.avgCost = data.avgCost
    if (data.currentPrice !== undefined) updateData.currentPrice = data.currentPrice
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.isManual !== undefined) updateData.isManual = data.isManual

    const updatedHolding = await prisma.holding.update({
      where: { id },
      data: updateData,
    })

    // Track edit as transaction if qty or avgCost changed
    if ((data.qty !== undefined || data.avgCost !== undefined) && !existingHolding.isManual) {
      const newQty = data.qty ?? Number(existingHolding.qty)
      const newAvgCost = data.avgCost ?? Number(existingHolding.avgCost)
      const transactionAmount = newQty * newAvgCost
      const transactionCurrency = data.currency ?? updatedHolding.currency

      // Fetch USD/INR rate if currency is USD and rate not available
      let usdInrRate: number | null = null
      let amountInr: number | null = null
      if (transactionCurrency === "USD") {
        try {
          const rateResponse = await fetch("https://api.exchangerate-api.com/v4/latest/USD")
          if (rateResponse.ok) {
            const rateData = await rateResponse.json()
            usdInrRate = rateData?.rates?.INR || null
            if (usdInrRate) {
              amountInr = transactionAmount * usdInrRate
            }
          }
        } catch (error) {
          console.error("Failed to fetch USD/INR rate:", error)
        }
      }

      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          holdingId: id,
          bucket: updatedHolding.bucket,
          symbol: updatedHolding.symbol,
          name: updatedHolding.name,
          qty: newQty,
          price: newAvgCost,
          amount: transactionAmount,
          currency: transactionCurrency,
          amountInr: amountInr,
          transactionType: "MANUAL_EDIT",
          purchaseDate: new Date(),
          description: "Holding manually edited",
          usdInrRate: usdInrRate,
        },
      })
    }

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
