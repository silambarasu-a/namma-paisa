import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
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

    // OTP is valid - return success (don't clear OTP yet, we'll clear it after password reset)
    return NextResponse.json({
      message: "OTP verified successfully",
      verified: true,
    })
  } catch (error) {
    console.error("OTP verification error:", error)
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    )
  }
}
