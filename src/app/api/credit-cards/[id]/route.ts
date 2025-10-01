import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const creditCardUpdateSchema = z.object({
  cardName: z.string().min(1).optional(),
  lastFourDigits: z.string().length(4).optional(),
  bank: z.string().min(1).optional(),
  billingCycle: z.number().int().min(1).max(31).optional(),
  dueDate: z.number().int().min(1).max(31).optional(),
  gracePeriod: z.number().int().min(0).max(10).optional(),
  cardNetwork: z.string().optional(),
  cardLimit: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

// Update credit card
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
    const validatedData = creditCardUpdateSchema.parse(body)

    // Check if card belongs to user
    const card = await prisma.creditCard.findUnique({
      where: { id },
    })

    if (!card || card.userId !== session.user.id) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const updatedCard = await prisma.creditCard.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(updatedCard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error updating credit card:", error)
    return NextResponse.json(
      { error: "Failed to update credit card" },
      { status: 500 }
    )
  }
}

// Delete credit card
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

    // Check if card belongs to user
    const card = await prisma.creditCard.findUnique({
      where: { id },
    })

    if (!card || card.userId !== session.user.id) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    await prisma.creditCard.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting credit card:", error)
    return NextResponse.json(
      { error: "Failed to delete credit card" },
      { status: 500 }
    )
  }
}