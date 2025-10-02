import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const creditCardSchema = z.object({
  cardName: z.string().min(1, "Card name is required"),
  lastFourDigits: z.string().length(4, "Must be exactly 4 digits"),
  bank: z.string().min(1, "Bank name is required"),
  billingCycle: z.number().int().min(1).max(31, "Billing cycle must be between 1-31"),
  dueDate: z.number().int().min(1).max(31, "Due date must be between 1-31"),
  gracePeriod: z.number().int().min(0).max(10, "Grace period must be between 0-10"),
  cardNetwork: z.string().optional(),
  cardLimit: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

// Get all credit cards for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cards = await prisma.creditCard.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(cards)
  } catch (error) {
    console.error("Error fetching credit cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch credit cards" },
      { status: 500 }
    )
  }
}

// Create a new credit card
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = creditCardSchema.parse(body)

    const card = await prisma.creditCard.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
    })

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error creating credit card:", error)
    return NextResponse.json(
      { error: "Failed to create credit card" },
      { status: 500 }
    )
  }
}