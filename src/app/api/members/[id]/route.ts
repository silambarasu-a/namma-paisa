import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const memberUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  category: z.enum(["FAMILY", "FRIEND", "RELATIVE", "OTHER"]).optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const member = await prisma.member.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { message: "Member not found" },
        { status: 404 }
      )
    }

    // Convert Decimal to number
    const formattedMember = {
      ...member,
      currentBalance: Number(member.currentBalance),
      extraSpent: Number(member.extraSpent),
      extraOwe: Number(member.extraOwe),
      transactions: member.transactions.map((txn) => ({
        ...txn,
        amount: Number(txn.amount),
        settledAmount: txn.settledAmount ? Number(txn.settledAmount) : null,
      })),
    }

    return NextResponse.json(formattedMember)
  } catch (error) {
    console.error("Member fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = memberUpdateSchema.parse(body)

    // Check if member exists and belongs to user
    const existingMember = await prisma.member.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingMember) {
      return NextResponse.json(
        { message: "Member not found" },
        { status: 404 }
      )
    }

    // If name is being updated, check if another member has that name
    if (validatedData.name && validatedData.name !== existingMember.name) {
      const duplicateName = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          name: validatedData.name,
          id: { not: id },
        },
      })

      if (duplicateName) {
        return NextResponse.json(
          { message: "A member with this name already exists" },
          { status: 400 }
        )
      }
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.category && { category: validatedData.category }),
        ...(validatedData.phoneNumber !== undefined && {
          phoneNumber: validatedData.phoneNumber || null,
        }),
        ...(validatedData.email !== undefined && {
          email: validatedData.email || null,
        }),
        ...(validatedData.notes !== undefined && {
          notes: validatedData.notes || null,
        }),
      },
    })

    return NextResponse.json({
      ...member,
      currentBalance: Number(member.currentBalance),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Member update error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if member exists and belongs to user
    const existingMember = await prisma.member.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!existingMember) {
      return NextResponse.json(
        { message: "Member not found" },
        { status: 404 }
      )
    }

    // Check if member has unsettled transactions
    const unsettledCount = await prisma.memberTransaction.count({
      where: {
        memberId: id,
        isSettled: false,
      },
    })

    if (unsettledCount > 0) {
      return NextResponse.json(
        { message: `Cannot delete member with ${unsettledCount} unsettled transaction(s). Please settle all transactions first.` },
        { status: 400 }
      )
    }

    await prisma.member.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Member deleted successfully" })
  } catch (error) {
    console.error("Member delete error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
