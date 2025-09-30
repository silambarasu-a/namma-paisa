import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 })
    }

    // Find user by verification token
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        message: "Email already verified",
        alreadyVerified: true,
      })
    }

    // Check if token is expired
    if (!user.verificationExpiry || new Date() > user.verificationExpiry) {
      return NextResponse.json({ error: "Verification token has expired" }, { status: 400 })
    }

    // Mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    })

    return NextResponse.json({
      message: "Email verified successfully! You can now sign in.",
      verified: true,
    })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { error: "An error occurred during verification" },
      { status: 500 }
    )
  }
}
