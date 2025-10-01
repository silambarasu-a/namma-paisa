import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const incomeUpdateSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date))).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  category: z.string().optional(),
  isRecurring: z.boolean().optional(),
})

// Update income
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
    const validatedData = incomeUpdateSchema.parse(body)

    // Check if income belongs to user
    const income = await prisma.income.findUnique({
      where: { id },
    })

    if (!income || income.userId !== session.user.id) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 })
    }

    const updateData: {
      date?: Date
      title?: string
      description?: string | null
      amount?: number
      category?: string
      isRecurring?: boolean
    } = {}
    if (validatedData.date) updateData.date = new Date(validatedData.date)
    if (validatedData.title) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.amount) updateData.amount = validatedData.amount
    if (validatedData.category) updateData.category = validatedData.category
    if (validatedData.isRecurring !== undefined) updateData.isRecurring = validatedData.isRecurring

    const updatedIncome = await prisma.income.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedIncome)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error updating income:", error)
    return NextResponse.json(
      { error: "Failed to update income" },
      { status: 500 }
    )
  }
}

// Delete income
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

    // Check if income belongs to user
    const income = await prisma.income.findUnique({
      where: { id },
    })

    if (!income || income.userId !== session.user.id) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 })
    }

    await prisma.income.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting income:", error)
    return NextResponse.json(
      { error: "Failed to delete income" },
      { status: 500 }
    )
  }
}