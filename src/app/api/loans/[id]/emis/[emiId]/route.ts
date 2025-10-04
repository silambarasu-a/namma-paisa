import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; emiId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: loanId, emiId } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Verify EMI belongs to loan and is paid
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
        { error: "EMI is not paid. Cannot delete payment that doesn't exist." },
        { status: 400 }
      )
    }

    // Get the paid amount to subtract from loan totals
    const paidAmount = Number(existingEmi.paidAmount) || 0

    // Calculate new totals
    const newTotalPaid = Math.max(0, Number(loan.totalPaid) - paidAmount)
    const newOutstanding = Number(loan.currentOutstanding) + paidAmount

    // Mark EMI as unpaid and clear payment details
    await prisma.eMI.update({
      where: { id: emiId },
      data: {
        isPaid: false,
        paidAmount: null,
        paidDate: null,
        principalPaid: null,
        interestPaid: null,
        lateFee: null,
        paymentMethod: null,
        paymentNotes: null,
      },
    })

    // Update loan totals
    await prisma.loan.update({
      where: { id: loanId },
      data: {
        totalPaid: newTotalPaid,
        currentOutstanding: newOutstanding,
      },
    })

    return NextResponse.json({
      message: "Payment deleted successfully. EMI marked as unpaid.",
    })
  } catch (error) {
    console.error("Error deleting payment:", error)
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    )
  }
}
