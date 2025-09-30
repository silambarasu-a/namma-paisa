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

const deleteSchema = z.object({
  id: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { monthly, effectiveFrom } = salarySchema.parse(body)

    // Parse date as local timezone (not UTC)
    const [year, month, day] = effectiveFrom.split('-').map(Number)
    const effectiveFromDate = new Date(year, month - 1, day)

    // Create new salary history entry
    const salaryHistory = await prisma.salaryHistory.create({
      data: {
        userId: session.user.id,
        monthly: monthly,
        effectiveFrom: effectiveFromDate,
      },
      select: {
        id: true,
        monthly: true,
        effectiveFrom: true,
        createdAt: true,
      },
    })

    return NextResponse.json(salaryHistory, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Salary update error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = deleteSchema.parse(body)

    // Verify the salary entry belongs to the user
    const salary = await prisma.salaryHistory.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!salary) {
      return NextResponse.json(
        { message: "Salary entry not found" },
        { status: 404 }
      )
    }

    if (salary.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Unauthorized to delete this entry" },
        { status: 403 }
      )
    }

    // Delete the salary entry
    await prisma.salaryHistory.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Salary entry deleted successfully" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Salary delete error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}