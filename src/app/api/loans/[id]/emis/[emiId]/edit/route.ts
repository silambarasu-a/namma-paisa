import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const editPaymentSchema = z.object({
  paidAmount: z.number().positive(),
  paidDate: z.string(),
  principalPaid: z.number().nonnegative().optional(),
  interestPaid: z.number().nonnegative().optional(),
  lateFee: z.number().nonnegative().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  paymentNotes: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; emiId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: loanId, emiId } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = editPaymentSchema.parse(body)

    // Verify loan belongs to user
    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId: session.user.id,
      },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    // Verify EMI belongs to loan
    const existingEmi = await prisma.eMI.findFirst({
      where: {
        id: emiId,
        loanId: loanId,
      },
    })

    if (!existingEmi) {
      return NextResponse.json({ error: "EMI not found" }, { status: 404 })
    }

    if (!existingEmi.isPaid) {
      return NextResponse.json(
        { error: "Cannot edit unpaid EMI. Use the pay EMI feature instead." },
        { status: 400 }
      )
    }

    // Calculate the difference between old and new payment amount
    const oldPaidAmount = Number(existingEmi.paidAmount) || 0
    const amountDifference = data.paidAmount - oldPaidAmount

    // Calculate new total paid and outstanding
    const newTotalPaid = Number(loan.totalPaid) + amountDifference
    const newOutstanding = Number(loan.currentOutstanding) - amountDifference

    // Calculate principal and interest if not provided
    const principal = data.principalPaid ?? 0
    const interest = data.interestPaid ?? 0

    // Update EMI
    const updatedEmi = await prisma.eMI.update({
      where: { id: emiId },
      data: {
        paidAmount: data.paidAmount,
        paidDate: new Date(data.paidDate),
        principalPaid: principal,
        interestPaid: interest,
        lateFee: data.lateFee,
        paymentMethod: data.paymentMethod,
        paymentNotes: data.paymentNotes,
      },
    })

    // Update loan totals
    await prisma.loan.update({
      where: { id: loanId },
      data: {
        totalPaid: newTotalPaid,
        currentOutstanding: Math.max(0, newOutstanding),
      },
    })

    return NextResponse.json({
      message: "Payment updated successfully",
      emi: updatedEmi,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }
    console.error("Error updating payment:", error)
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    )
  }
}
