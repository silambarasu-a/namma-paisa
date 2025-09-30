import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateVerificationToken, sendEmailVerification } from "@/lib/email"

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().optional(),
  countryCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phoneNumber, countryCode } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate verification token
    const verificationToken = generateVerificationToken()
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        phoneNumber,
        countryCode: countryCode || "+91",
        verificationToken,
        verificationExpiry,
        emailVerified: false,
        profiles: {
          create: {
            displayName: name,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        createdAt: true,
      },
    })

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}`

    const emailResult = await sendEmailVerification(email, verificationLink, name)

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error)
      // Continue even if email fails - user can request new verification email
    }

    return NextResponse.json(
      {
        message: "User created successfully. Please check your email to verify your account.",
        user,
        emailSent: emailResult.success
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}