import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const salarySchema = z.object({
  monthly: z.number().positive("Monthly salary must be positive"),
  effectiveFrom: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const salaryHistory = await prisma.salaryHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { effectiveFrom: "desc" },
      select: {
        id: true,
        monthly: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
      },
    })

    // Map to frontend format
    const formattedHistory = salaryHistory.map(item => ({
      id: item.id,
      monthly: Number(item.monthly),
      effectiveFrom: item.effectiveFrom.toISOString(),
      effectiveTo: item.effectiveTo?.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }))

    return NextResponse.json(formattedHistory)
  } catch (error) {
    console.error("Salary history fetch error:", error)
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
    const validatedData = salarySchema.parse(body)

    // Check if there's a current active salary and close it
    const currentSalary = await prisma.salaryHistory.findFirst({
      where: {
        userId: session.user.id,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: "desc" },
    })

    // Parse date as local timezone (not UTC)
    const [year, month, day] = validatedData.effectiveFrom.split('-').map(Number)
    const effectiveFromDate = new Date(year, month - 1, day)

    if (currentSalary) {
      // Close the current salary record
      await prisma.salaryHistory.update({
        where: { id: currentSalary.id },
        data: { effectiveTo: effectiveFromDate },
      })
    }

    // Create new salary record
    const newSalary = await prisma.salaryHistory.create({
      data: {
        userId: session.user.id,
        monthly: validatedData.monthly,
        effectiveFrom: effectiveFromDate,
      },
    })

    return NextResponse.json({
      id: newSalary.id,
      monthly: Number(newSalary.monthly),
      effectiveFrom: newSalary.effectiveFrom.toISOString(),
      effectiveTo: newSalary.effectiveTo?.toISOString(),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Salary creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}