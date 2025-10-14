import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const memberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["FAMILY", "FRIEND", "RELATIVE", "OTHER"]),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || null
    const search = searchParams.get("search") || null

    const where: {
      userId: string
      category?: "FAMILY" | "FRIEND" | "RELATIVE" | "OTHER"
      OR?: Array<{ name: { contains: string; mode: "insensitive" } } | { email: { contains: string; mode: "insensitive" } }>
    } = { userId: session.user.id }

    if (category && ["FAMILY", "FRIEND", "RELATIVE", "OTHER"].includes(category)) {
      where.category = category as "FAMILY" | "FRIEND" | "RELATIVE" | "OTHER"
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    const members = await prisma.member.findMany({
      where,
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        phoneNumber: true,
        email: true,
        notes: true,
        currentBalance: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    // Convert Decimal to number
    const formattedMembers = members.map((member) => ({
      ...member,
      currentBalance: Number(member.currentBalance),
    }))

    // Calculate summary
    const summary = formattedMembers.reduce(
      (acc, member) => {
        acc.totalMembers += 1
        if (member.currentBalance > 0) {
          acc.totalOwedToYou += member.currentBalance
          acc.membersOwingYou += 1
        } else if (member.currentBalance < 0) {
          acc.totalYouOwe += Math.abs(member.currentBalance)
          acc.membersYouOwe += 1
        }
        return acc
      },
      {
        totalMembers: 0,
        totalOwedToYou: 0,
        totalYouOwe: 0,
        membersOwingYou: 0,
        membersYouOwe: 0,
        netBalance: 0,
      }
    )

    summary.netBalance = summary.totalOwedToYou - summary.totalYouOwe

    return NextResponse.json({ members: formattedMembers, summary })
  } catch (error) {
    console.error("Members fetch error:", error)
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
    const validatedData = memberSchema.parse(body)

    // Check if member with same name already exists for this user
    const existingMember = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        name: validatedData.name,
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { message: "A member with this name already exists" },
        { status: 400 }
      )
    }

    const member = await prisma.member.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        category: validatedData.category,
        phoneNumber: validatedData.phoneNumber || null,
        email: validatedData.email || null,
        notes: validatedData.notes || null,
      },
    })

    return NextResponse.json(
      {
        ...member,
        currentBalance: Number(member.currentBalance),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Member creation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
