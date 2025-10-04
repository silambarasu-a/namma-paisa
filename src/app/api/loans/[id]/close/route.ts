import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const closeSchema = z.object({
  paidAmount: z.number().positive(),
  paidDate: z.string(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  paymentNotes: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: loanId } = await params
    const body = await request.json()
    const data = closeSchema.parse(body)

    // Verify loan belongs to user
    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId: session.user.id,
      },
      include: {
        emis: {
          where: {
            isPaid: false,
          },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    if (loan.isClosed) {
      return NextResponse.json(
        { error: "Loan is already closed" },
        { status: 400 }
      )
    }

    // Mark all unpaid EMIs as paid
    const unpaidEmis = loan.emis
    for (const emi of unpaidEmis) {
      await prisma.eMI.update({
        where: { id: emi.id },
        data: {
          isPaid: true,
          paidAmount: Number(emi.emiAmount),
          paidDate: new Date(data.paidDate),
          principalPaid: Number(emi.emiAmount),
          paymentMethod: data.paymentMethod,
          paymentNotes: `Loan closed early. ${data.paymentNotes || ""}`.trim(),
        },
      })
    }

    // Update loan as closed
    const newTotalPaid = Number(loan.totalPaid) + Number(data.paidAmount)
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        currentOutstanding: 0,
        totalPaid: newTotalPaid,
        isClosed: true,
        closedAt: new Date(data.paidDate),
        isActive: false,
      },
    })

    return NextResponse.json({
      loan: updatedLoan,
      message: "Loan closed successfully!",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }
    console.error("Error closing loan:", error)
    return NextResponse.json(
      { error: "Failed to close loan" },
      { status: 500 }
    )
  }
}
