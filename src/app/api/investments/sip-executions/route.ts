import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, ExecutionStatus } from "@/generated/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const sipId = searchParams.get("sipId")
    const status = searchParams.get("status")

    // Build where clause
    const where: Prisma.SIPExecutionWhereInput = { userId: session.user.id }

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

      where.executionDate = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Filter by SIP ID
    if (sipId) {
      where.sipId = sipId
    }

    // Filter by status
    if (status && Object.values(ExecutionStatus).includes(status as ExecutionStatus)) {
      where.status = status as ExecutionStatus
    }

    const executions = await prisma.sIPExecution.findMany({
      where,
      orderBy: { executionDate: "desc" },
      include: {
        sip: {
          select: {
            id: true,
            name: true,
            bucket: true,
            symbol: true,
          },
        },
        holding: {
          select: {
            id: true,
            name: true,
            symbol: true,
          },
        },
      },
    })

    // Convert Decimal types to numbers for JSON serialization
    const serializedExecutions = executions.map(exec => ({
      ...exec,
      amount: Number(exec.amount),
      qty: exec.qty ? Number(exec.qty) : null,
      price: exec.price ? Number(exec.price) : null,
      executionDate: exec.executionDate.toISOString(),
      createdAt: exec.createdAt.toISOString(),
      updatedAt: exec.updatedAt.toISOString(),
    }))

    return NextResponse.json(serializedExecutions)
  } catch (error) {
    console.error("Error fetching SIP executions:", error)
    return NextResponse.json(
      { error: "Failed to fetch SIP executions" },
      { status: 500 }
    )
  }
}
