import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const loanUpdateSchema = z.object({
  loanType: z
    .enum([
      "HOME_LOAN",
      "CAR_LOAN",
      "PERSONAL_LOAN",
      "EDUCATION_LOAN",
      "BUSINESS_LOAN",
      "GOLD_LOAN",
      "CREDIT_CARD",
      "OTHER",
    ])
    .optional(),
  institution: z.string().min(1).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loan = await prisma.loan.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        emis: {
          orderBy: { dueDate: "asc" },
        },
        goldItems: true,
      },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    // Calculate remaining tenure - count ALL unpaid EMIs
    const remainingTenure = await prisma.eMI.count({
      where: {
        loanId: id,
        isPaid: false,
      }
    })

    const transformedLoan = {
      ...loan,
      principalAmount: Number(loan.principalAmount),
      interestRate: Number(loan.interestRate),
      emiAmount: Number(loan.emiAmount),
      currentOutstanding: Number(loan.currentOutstanding),
      totalPaid: Number(loan.totalPaid),
      remainingTenure,
      emis: loan.emis.map(emi => ({
        ...emi,
        emiAmount: Number(emi.emiAmount),
        paidAmount: emi.paidAmount ? Number(emi.paidAmount) : null,
        principalPaid: emi.principalPaid ? Number(emi.principalPaid) : null,
        interestPaid: emi.interestPaid ? Number(emi.interestPaid) : null,
        lateFee: emi.lateFee ? Number(emi.lateFee) : null,
      })),
      goldItems: loan.goldItems?.map(item => ({
        ...item,
        carat: Number(item.carat),
        quantity: Number(item.quantity),
        grossWeight: Number(item.grossWeight),
        netWeight: Number(item.netWeight),
        loanAmount: item.loanAmount ? Number(item.loanAmount) : null,
      })) || [],
    }

    return NextResponse.json(transformedLoan, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error("Error fetching loan:", error)
    return NextResponse.json(
      { error: "Failed to fetch loan" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = loanUpdateSchema.parse(body)

    const loan = await prisma.loan.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data,
    })

    if (loan.count === 0) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    const updatedLoan = await prisma.loan.findUnique({
      where: { id },
    })

    return NextResponse.json(updatedLoan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("Error updating loan:", error)
    return NextResponse.json(
      { error: "Failed to update loan" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Verify the loan belongs to the user
    const existingLoan = await prisma.loan.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        emis: true,
      },
    })

    if (!existingLoan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    // Check if payment schedule has changed
    const scheduleChanged = JSON.stringify(existingLoan.paymentSchedule) !== JSON.stringify(body.paymentSchedule)
    const frequencyChanged = existingLoan.emiFrequency !== body.emiFrequency
    const startDateChanged = existingLoan.startDate.toISOString() !== new Date(body.startDate).toISOString()

    // If payment schedule, frequency, or start date changed, regenerate unpaid EMIs
    const shouldRegenerateEMIs = scheduleChanged || frequencyChanged || startDateChanged

    // Delete existing gold items if updating a gold loan
    if (body.goldItems) {
      await prisma.goldLoanItem.deleteMany({
        where: { loanId: id },
      })
    }

    // If we need to regenerate EMIs, delete only unpaid EMIs
    if (shouldRegenerateEMIs) {
      await prisma.eMI.deleteMany({
        where: {
          loanId: id,
          isPaid: false,
        },
      })
    }

    // Update the loan
    await prisma.loan.update({
      where: { id },
      data: {
        loanType: body.loanType,
        institution: body.institution,
        accountHolderName: body.accountHolderName,
        principalAmount: body.principalAmount,
        interestRate: body.interestRate,
        tenure: body.tenure,
        emiAmount: body.emiAmount,
        emiFrequency: body.emiFrequency,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        accountNumber: body.accountNumber,
        description: body.description,
        paymentSchedule: body.paymentSchedule || null,
        goldItems: body.goldItems
          ? {
              create: body.goldItems.map((item: {
                title: string
                carat: number
                quantity: number
                grossWeight: number
                netWeight: number
                loanAmount?: number
              }) => ({
                title: item.title,
                carat: item.carat,
                quantity: item.quantity,
                grossWeight: item.grossWeight,
                netWeight: item.netWeight,
                loanAmount: item.loanAmount,
              })),
            }
          : undefined,
      },
      include: {
        emis: true,
        goldItems: true,
      },
    })

    // If we need to regenerate EMIs, create new unpaid EMIs
    if (shouldRegenerateEMIs) {
      // Count how many EMIs were paid
      const paidEmisCount = existingLoan.emis.filter(emi => emi.isPaid).length
      const remainingEMIs = body.tenure - paidEmisCount

      if (remainingEMIs > 0) {
        const startDate = new Date(body.startDate)
        const startYear = startDate.getFullYear()
        const newEmis = []

        // Create a map of custom EMI amounts if provided
        const customEMIMap = new Map<number, number>()
        if (body.customEMIs && body.customEMIs.length > 0) {
          body.customEMIs.forEach((emi: { installmentNumber: number; amount: number }) => {
            customEMIMap.set(emi.installmentNumber, emi.amount)
          })
        }

        // Helper function to calculate months between payments based on frequency
        const getMonthsIncrement = (frequency: string): number => {
          switch (frequency) {
            case "MONTHLY":
              return 1
            case "QUARTERLY":
              return 3
            case "HALF_YEARLY":
              return 6
            case "ANNUALLY":
              return 12
            case "CUSTOM":
              return 1
            default:
              return 1
          }
        }

        if (body.emiFrequency === "MONTHLY") {
          // For monthly, start from the next unpaid installment
          for (let i = paidEmisCount; i < body.tenure; i++) {
            const dueDate = new Date(startDate)
            dueDate.setMonth(dueDate.getMonth() + i)

            const customEMIAmount: number = customEMIMap.get(i + 1) || body.emiAmount

            newEmis.push({
              emiAmount: customEMIAmount,
              dueDate,
              isPaid: false,
            })
          }
        } else if (body.paymentSchedule && body.paymentSchedule.dates.length > 0) {
          const { dates } = body.paymentSchedule
          const monthsIncrement = getMonthsIncrement(body.emiFrequency)

          let totalPayments: number
          if (body.emiFrequency === "CUSTOM") {
            totalPayments = Math.ceil(body.tenure / dates.length)
          } else {
            totalPayments = Math.ceil(body.tenure / monthsIncrement)
          }

          // Calculate the first occurrence of each schedule date on or after startDate
          const scheduleWithFirstOccurrence = dates.map((scheduleDate: { month: number; day: number }) => {
            let firstOccurrence = new Date(startYear, scheduleDate.month - 1, scheduleDate.day)

            if (firstOccurrence < startDate) {
              firstOccurrence = new Date(startYear + 1, scheduleDate.month - 1, scheduleDate.day)
            }

            return { scheduleDate, firstOccurrence }
          })

          scheduleWithFirstOccurrence.sort((a: { scheduleDate: { month: number; day: number }; firstOccurrence: Date }, b: { scheduleDate: { month: number; day: number }; firstOccurrence: Date }) => a.firstOccurrence.getTime() - b.firstOccurrence.getTime())

          let emisGenerated = 0

          // Generate EMIs for each year, starting from where we left off
          for (let year = 0; year < Math.ceil(totalPayments / dates.length) + 1 && emisGenerated < remainingEMIs; year++) {
            for (const { firstOccurrence } of scheduleWithFirstOccurrence) {
              if (emisGenerated >= remainingEMIs) break

              const dueDate = new Date(firstOccurrence)
              dueDate.setFullYear(firstOccurrence.getFullYear() + year)

              const customEMIAmount: number = customEMIMap.get(paidEmisCount + emisGenerated + 1) || body.emiAmount

              newEmis.push({
                emiAmount: customEMIAmount,
                dueDate,
                isPaid: false,
              })

              emisGenerated++
            }
          }
        } else {
          // Fallback for other frequencies without payment schedule
          const monthsIncrement = getMonthsIncrement(body.emiFrequency)

          for (let i = paidEmisCount; i < body.tenure; i++) {
            const dueDate = new Date(startDate)
            dueDate.setMonth(dueDate.getMonth() + (i * monthsIncrement))

            const customEMIAmount: number = customEMIMap.get(i + 1) || body.emiAmount

            newEmis.push({
              emiAmount: customEMIAmount,
              dueDate,
              isPaid: false,
            })
          }
        }

        console.log('EMI Regeneration Debug:', {
          paidEmisCount,
          remainingEMIs,
          newEmisLength: newEmis.length,
          tenure: body.tenure,
          frequency: body.emiFrequency,
          hasPaymentSchedule: !!body.paymentSchedule
        })

        // Create new unpaid EMIs
        if (newEmis.length > 0) {
          await prisma.eMI.createMany({
            data: newEmis.map(emi => ({
              ...emi,
              loanId: id,
            })),
          })
        }
      }
    }

    // Fetch the final updated loan with all EMIs
    const finalLoan = await prisma.loan.findUnique({
      where: { id },
      include: {
        emis: {
          orderBy: { dueDate: "asc" },
        },
        goldItems: true,
      },
    })

    return NextResponse.json(finalLoan)
  } catch (error) {
    console.error("Error updating loan:", error)
    return NextResponse.json(
      { error: "Failed to update loan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loan = await prisma.loan.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (loan.count === 0) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting loan:", error)
    return NextResponse.json(
      { error: "Failed to delete loan" },
      { status: 500 }
    )
  }
}