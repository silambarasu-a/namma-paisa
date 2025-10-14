import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMonthNotClosed } from "@/lib/snapshot-utils"
import { Prisma } from "@/generated/prisma"

const closeSchema = z.object({
  paidAmount: z.number().positive(),
  paidDate: z.string(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  paymentNotes: z.string().optional(),
  preclosureCharges: z.number().nonnegative().optional().default(0),
  additionalInterest: z.number().nonnegative().optional().default(0),
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

    // Validate that the closure date is not in a closed month
    const paidDate = new Date(data.paidDate)
    await validateMonthNotClosed(session.user.id, paidDate, "close this loan")

    // Verify loan belongs to user and get all unpaid EMIs
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

    const unpaidEmis = loan.emis

    if (unpaidEmis.length === 0) {
      return NextResponse.json(
        { error: "No unpaid EMIs to close" },
        { status: 400 }
      )
    }

    // Calculate total remaining amount from unpaid EMIs
    const totalRemainingEMI = unpaidEmis.reduce(
      (sum, emi) => sum + Number(emi.emiAmount),
      0
    )

    // Calculate total amount including additional charges
    const totalExpectedAmount = totalRemainingEMI + data.preclosureCharges + data.additionalInterest

    // Warn if paid amount doesn't match (allow it but log)
    if (Math.abs(data.paidAmount - totalExpectedAmount) > 0.01) {
      console.warn(
        `Loan closure amount mismatch: Paid ${data.paidAmount}, Expected ${totalExpectedAmount} (EMI: ${totalRemainingEMI} + Preclosure: ${data.preclosureCharges} + Interest: ${data.additionalInterest})`
      )
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Calculate interest rate per period for proper principal/interest split
      const monthlyRate = Number(loan.interestRate) / 100 / 12
      let remainingPrincipal = Number(loan.currentOutstanding)

      // Mark all unpaid EMIs as paid with proper principal/interest split
      for (const emi of unpaidEmis) {
        const emiAmount = Number(emi.emiAmount)

        // Calculate interest on remaining principal
        const interestPortion = remainingPrincipal * monthlyRate
        const principalPortion = emiAmount - interestPortion

        // Update remaining principal
        remainingPrincipal = Math.max(0, remainingPrincipal - principalPortion)

        await tx.eMI.update({
          where: { id: emi.id },
          data: {
            isPaid: true,
            paidAmount: new Prisma.Decimal(emiAmount),
            paidDate: new Date(data.paidDate),
            principalPaid: new Prisma.Decimal(principalPortion),
            interestPaid: new Prisma.Decimal(interestPortion),
            lateFee: new Prisma.Decimal(0),
            paymentMethod: data.paymentMethod,
            paymentNotes: `Loan closed early. ${data.paymentNotes || ""}`.trim(),
          },
        })
      }

      // Update loan as closed
      const newTotalPaid = Number(loan.totalPaid) + data.paidAmount

      // Update principal amount to reflect actual total loan cost
      // Original principal + preclosure charges + additional interest
      const newPrincipalAmount = Number(loan.principalAmount) + data.preclosureCharges + data.additionalInterest

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          principalAmount: new Prisma.Decimal(newPrincipalAmount),
          currentOutstanding: new Prisma.Decimal(0),
          totalPaid: new Prisma.Decimal(newTotalPaid),
          preclosureCharges: data.preclosureCharges > 0 ? new Prisma.Decimal(data.preclosureCharges) : null,
          additionalInterest: data.additionalInterest > 0 ? new Prisma.Decimal(data.additionalInterest) : null,
          isClosed: true,
          closedAt: new Date(data.paidDate),
          isActive: false,
        },
      })

      return updatedLoan
    })

    return NextResponse.json({
      loan: {
        ...result,
        principalAmount: Number(result.principalAmount),
        interestRate: Number(result.interestRate),
        emiAmount: Number(result.emiAmount),
        currentOutstanding: Number(result.currentOutstanding),
        totalPaid: Number(result.totalPaid),
        preclosureCharges: result.preclosureCharges ? Number(result.preclosureCharges) : null,
        additionalInterest: result.additionalInterest ? Number(result.additionalInterest) : null,
      },
      message: "Loan closed successfully!",
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
    console.error("Error closing loan:", error)
    return NextResponse.json(
      { error: "Failed to close loan" },
      { status: 500 }
    )
  }
}
