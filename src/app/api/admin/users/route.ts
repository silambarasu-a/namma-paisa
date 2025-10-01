import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@/constants"

// GET - List all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.roles.includes(Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        countryCode: true,
        roles: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        recentlyAccessedAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST - Create new user (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.roles.includes(Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, name, phoneNumber, countryCode, roles } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: name || null,
        phoneNumber: phoneNumber || null,
        countryCode: countryCode || "+91",
        roles: roles || [Role.CUSTOMER],
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isBlocked: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}