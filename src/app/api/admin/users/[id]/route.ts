import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT - Update user (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, phoneNumber, countryCode, roles, isBlocked } = body

    // Prevent admin from blocking themselves
    if (session.user.id === id && isBlocked) {
      return NextResponse.json(
        { error: "You cannot block yourself" },
        { status: 400 }
      )
    }

    // Prevent admin from removing their own admin role
    if (session.user.id === id && roles && !roles.includes("SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "You cannot remove your own SUPER_ADMIN role" },
        { status: 400 }
      )
    }

    const updateData: {
      name?: string
      phoneNumber?: string
      countryCode?: string
      roles?: ("SUPER_ADMIN" | "CUSTOMER")[]
      isBlocked?: boolean
    } = {}
    if (name !== undefined) updateData.name = name
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber
    if (countryCode !== undefined) updateData.countryCode = countryCode
    if (roles !== undefined) updateData.roles = roles as ("SUPER_ADMIN" | "CUSTOMER")[]
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    // Prevent admin from deleting themselves
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
