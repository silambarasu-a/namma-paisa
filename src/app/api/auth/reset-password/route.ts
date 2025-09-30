import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Check if OTP exists
    if (!user.resetOtp || !user.resetOtpExpiry) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    // Check if OTP is expired
    if (new Date() > user.resetOtpExpiry) {
      // Clear expired OTP
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetOtp: null,
          resetOtpExpiry: null,
        },
      })
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 })
    }

    // Verify OTP
    if (user.resetOtp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        resetOtp: null,
        resetOtpExpiry: null,
      },
    })

    return NextResponse.json({
      message: "Password reset successfully",
    })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    )
  }
}
