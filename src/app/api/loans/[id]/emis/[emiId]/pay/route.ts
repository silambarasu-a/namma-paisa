import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"

const paymentSchema = z.object({
  paidAmount: z.number().positive(),
  paidDate: z.string(),
  principalPaid: z.number().optional(),
  interestPaid: z.number().optional(),
  lateFee: z.number().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  paymentNotes: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; emiId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: loanId, emiId } = await params
    const body = await request.json()

    console.log("Payment request received:", { loanId, emiId, body })

    const data = paymentSchema.parse(body)

    // Validate that the paid date is not in a closed month
    const paidDate = new Date(data.paidDate)
    await validateMonthNotClosed(session.user.id, paidDate, "record this EMI payment")

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
          orderBy: {
            dueDate: "asc",
          },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    // Verify EMI belongs to loan
    const emi = await prisma.eMI.findFirst({
      where: {
        id: emiId,
        loanId,
      },
    })

    if (!emi) {
      return NextResponse.json({ error: "EMI not found" }, { status: 404 })
    }

    if (emi.isPaid) {
      return NextResponse.json(
        { error: "EMI already paid" },
        { status: 400 }
      )
    }

    // Calculate principal and interest paid if not provided
    const principal = data.principalPaid || data.paidAmount
    const interest = data.interestPaid || 0

    // Update EMI as paid
    console.log("Updating EMI:", { emiId, data })
    const updatedEmi = await prisma.eMI.update({
      where: { id: emiId },
      data: {
        isPaid: true,
        paidAmount: data.paidAmount,
        paidDate: new Date(data.paidDate),
        principalPaid: principal,
        interestPaid: interest,
        lateFee: data.lateFee,
        paymentMethod: data.paymentMethod,
        paymentNotes: data.paymentNotes,
      },
    })
    console.log("EMI updated successfully:", updatedEmi)

    // Update loan's current outstanding and total paid
    const newOutstanding = Math.max(
      0,
      Number(loan.currentOutstanding) - Number(principal)
    )
    const newTotalPaid = Number(loan.totalPaid) + Number(data.paidAmount)

    // Check if loan should be closed
    const remainingUnpaidEmis = loan.emis.filter(
      (e) => e.id !== emiId && !e.isPaid
    ).length

    const shouldCloseLoan = newOutstanding <= 0 || remainingUnpaidEmis === 0

    console.log("Updating loan:", { loanId, newOutstanding, newTotalPaid, shouldCloseLoan })
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        currentOutstanding: newOutstanding,
        totalPaid: newTotalPaid,
        isClosed: shouldCloseLoan,
        closedAt: shouldCloseLoan ? new Date() : null,
        isActive: !shouldCloseLoan,
      },
    })
    console.log("Loan updated successfully:", updatedLoan)

    return NextResponse.json({
      emi: updatedEmi,
      loan: updatedLoan,
      message: shouldCloseLoan
        ? "Payment recorded and loan closed successfully!"
        : "Payment recorded successfully!",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes("month has been closed")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error recording payment:", error)
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    )
  }
}
