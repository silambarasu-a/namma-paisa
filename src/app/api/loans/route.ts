import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const loanSchema = z.object({
  loanType: z.enum([
    "HOME_LOAN",
    "CAR_LOAN",
    "PERSONAL_LOAN",
    "EDUCATION_LOAN",
    "BUSINESS_LOAN",
    "GOLD_LOAN",
    "CREDIT_CARD",
    "OTHER",
  ]),
  institution: z.string().min(1),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  tenure: z.number().int().positive(),
  emiAmount: z.number().positive(),
  startDate: z.string(),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loans = await prisma.loan.findMany({
      where: { userId: session.user.id },
      include: {
        emis: {
          where: { isPaid: false },
          orderBy: { dueDate: "asc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error("Error fetching loans:", error)
    return NextResponse.json(
      { error: "Failed to fetch loans" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = loanSchema.parse(body)

    const loan = await prisma.loan.create({
      data: {
        ...data,
        userId: session.user.id,
        startDate: new Date(data.startDate),
        currentOutstanding: data.principalAmount,
      },
    })

    // Generate EMI schedule
    const emiSchedule = []
    const startDate = new Date(data.startDate)

    for (let i = 0; i < data.tenure; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i + 1)

      emiSchedule.push({
        loanId: loan.id,
        emiAmount: data.emiAmount,
        dueDate,
        isPaid: false,
      })
    }

    await prisma.eMI.createMany({
      data: emiSchedule,
    })

    return NextResponse.json(loan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating loan:", error)
    return NextResponse.json(
      { error: "Failed to create loan" },
      { status: 500 }
    )
  }
}