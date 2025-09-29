import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const salarySchema = z.object({
  netMonthly: z.number().positive("Net monthly salary must be positive"),
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
    const { netMonthly, effectiveFrom } = salarySchema.parse(body)

    // Create new salary history entry
    const salaryHistory = await prisma.netSalaryHistory.create({
      data: {
        userId: session.user.id,
        netMonthly: netMonthly,
        effectiveFrom: new Date(effectiveFrom),
      },
      select: {
        id: true,
        netMonthly: true,
        effectiveFrom: true,
        createdAt: true,
      },
    })

    return NextResponse.json(salaryHistory, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.issues },
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
    const salary = await prisma.netSalaryHistory.findUnique({
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
    await prisma.netSalaryHistory.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Salary entry deleted successfully" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.issues },
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