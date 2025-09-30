import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOTP, sendPasswordResetOTP } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive an OTP shortly.",
      })
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive an OTP shortly.",
      })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Save OTP to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpiry: otpExpiry,
      },
    })

    // Send email
    const emailResult = await sendPasswordResetOTP(email, otp, user.name || undefined)

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error)
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "If an account exists with this email, you will receive an OTP shortly.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    )
  }
}
