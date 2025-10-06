import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const sipUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
  currency: z.enum(["INR", "USD"]).optional(),
  amountInINR: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = sipUpdateSchema.parse(body)

    const updateData: {
      name?: string;
      amount?: number;
      endDate?: Date | null;
      isActive?: boolean;
      description?: string;
      currency?: string;
      amountInINR?: boolean;
    } = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.description !== undefined) updateData.description = data.description
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.amountInINR !== undefined) updateData.amountInINR = data.amountInINR
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null
    }

    const sip = await prisma.sIP.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: updateData,
    })

    if (sip.count === 0) {
      return NextResponse.json({ error: "SIP not found" }, { status: 404 })
    }

    const updatedSip = await prisma.sIP.findUnique({
      where: { id },
    })

    return NextResponse.json(updatedSip)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error updating SIP:", error)
    return NextResponse.json(
      { error: "Failed to update SIP" },
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
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sip = await prisma.sIP.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (sip.count === 0) {
      return NextResponse.json({ error: "SIP not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting SIP:", error)
    return NextResponse.json(
      { error: "Failed to delete SIP" },
      { status: 500 }
    )
  }
}