import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const salaryHistory = await prisma.netSalaryHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { effectiveFrom: "desc" },
      select: {
        id: true,
        netMonthly: true,
        effectiveFrom: true,
        createdAt: true,
      },
    })

    return NextResponse.json(salaryHistory)
  } catch (error) {
    console.error("Salary history fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}