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
          where: {
            isPaid: false,
            dueDate: {
              gte: new Date(), // Only show EMIs due today or in the future
            }
          },
          orderBy: { dueDate: "asc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform the response to ensure proper data types
    const transformedLoans = loans.map(loan => ({
      ...loan,
      principalAmount: Number(loan.principalAmount),
      interestRate: Number(loan.interestRate),
      emiAmount: Number(loan.emiAmount),
      currentOutstanding: Number(loan.currentOutstanding),
      emis: loan.emis.map(emi => ({
        ...emi,
        emiAmount: Number(emi.emiAmount),
      }))
    }))

    return NextResponse.json(transformedLoans)
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

    // Generate EMI schedule
    const emis = []
    for (let i = 0; i < data.tenure; i++) {
      const dueDate = new Date(data.startDate)
      dueDate.setMonth(dueDate.getMonth() + i)
      emis.push({
        emiAmount: data.emiAmount,
        dueDate,
        isPaid: false,
      })
    }

    // Create loan with EMI schedule
    const loan = await prisma.loan.create({
      data: {
        ...data,
        userId: session.user.id,
        startDate: new Date(data.startDate),
        currentOutstanding: data.principalAmount,
        emis: {
          create: emis,
        },
      },
      include: {
        emis: {
          orderBy: { dueDate: "asc" },
          take: 3,
        },
      },
    })

    return NextResponse.json(loan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error creating loan:", error)
    return NextResponse.json(
      { error: "Failed to create loan" },
      { status: 500 }
    )
  }
}