import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateTransactionSchema = z.object({
  qty: z.number().positive().optional(),
  price: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  amountInr: z.number().positive().optional().nullable(),
  usdInrRate: z.number().positive().optional().nullable(),
  purchaseDate: z.string().optional(),
  description: z.string().optional(),
})

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get the transaction with holding info
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { holding: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    if (transaction.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // If there's no associated holding, just delete the transaction
    if (!transaction.holding) {
      await prisma.transaction.delete({ where: { id } })
      return NextResponse.json({ message: "Transaction deleted successfully" })
    }

    const holding = transaction.holding

    // Calculate new holding values after removing this transaction
    const oldQty = Number(holding.qty)
    const oldAvgCost = Number(holding.avgCost)
    const removedQty = Number(transaction.qty)
    const removedPrice = Number(transaction.price)

    const newQty = oldQty - removedQty

    if (newQty < 0) {
      return NextResponse.json(
        { error: "Cannot delete transaction: would result in negative quantity" },
        { status: 400 }
      )
    }

    // Delete the transaction and update/delete the holding
    if (newQty === 0) {
      // Delete both transaction and holding
      await prisma.$transaction([
        prisma.transaction.delete({ where: { id } }),
        prisma.holding.delete({ where: { id: holding.id } }),
      ])
    } else {
      // Calculate new average cost
      // Formula: newAvgCost = (oldQty * oldAvgCost - removedQty * removedPrice) / newQty
      const newAvgCost = (oldQty * oldAvgCost - removedQty * removedPrice) / newQty

      // For USD holdings with weighted exchange rate, recalculate
      let newUsdInrRate = holding.usdInrRate ? Number(holding.usdInrRate) : null

      if (holding.currency === "USD" && transaction.usdInrRate && holding.usdInrRate) {
        // Recalculate weighted USD/INR rate
        const oldRate = Number(holding.usdInrRate)
        const removedRate = Number(transaction.usdInrRate)

        // Remove the contribution of this transaction from the weighted average
        // Formula: newRate = (oldQty * oldRate - removedQty * removedRate) / newQty
        newUsdInrRate = (oldQty * oldRate - removedQty * removedRate) / newQty
      }

      // Update holding and delete transaction
      await prisma.$transaction([
        prisma.holding.update({
          where: { id: holding.id },
          data: {
            qty: newQty,
            avgCost: newAvgCost,
            usdInrRate: newUsdInrRate,
            updatedAt: new Date(),
          },
        }),
        prisma.transaction.delete({ where: { id } }),
      ])
    }

    return NextResponse.json({
      message: "Transaction deleted successfully",
      holdingDeleted: newQty === 0,
    })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateTransactionSchema.parse(body)

    // Get the transaction with holding info
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { holding: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    if (transaction.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // If there's no holding, just update the transaction
    if (!transaction.holding) {
      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          qty: data.qty,
          price: data.price,
          amount: data.amount,
          currency: data.currency,
          amountInr: data.amountInr,
          usdInrRate: data.usdInrRate,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          description: data.description,
        },
      })
      return NextResponse.json(updated)
    }

    const holding = transaction.holding

    // Calculate holding values without this transaction (reverse the old transaction)
    const holdingQty = Number(holding.qty)
    const holdingAvgCost = Number(holding.avgCost)
    const oldTxnQty = Number(transaction.qty)
    const oldTxnPrice = Number(transaction.price)

    const qtyWithoutOldTxn = holdingQty - oldTxnQty

    if (qtyWithoutOldTxn < 0) {
      return NextResponse.json(
        { error: "Cannot update: invalid holding state" },
        { status: 400 }
      )
    }

    let avgCostWithoutOldTxn = 0
    if (qtyWithoutOldTxn > 0) {
      avgCostWithoutOldTxn = (holdingQty * holdingAvgCost - oldTxnQty * oldTxnPrice) / qtyWithoutOldTxn
    }

    // Apply new transaction values
    const newTxnQty = data.qty ?? oldTxnQty
    const newTxnPrice = data.price ?? oldTxnPrice
    const newQty = qtyWithoutOldTxn + newTxnQty

    let newAvgCost: number
    if (qtyWithoutOldTxn === 0) {
      newAvgCost = newTxnPrice
    } else {
      newAvgCost = (qtyWithoutOldTxn * avgCostWithoutOldTxn + newTxnQty * newTxnPrice) / newQty
    }

    // Handle USD/INR rate updates for USD holdings
    let newUsdInrRate = holding.usdInrRate ? Number(holding.usdInrRate) : null

    if (holding.currency === "USD") {
      const oldTxnRate = transaction.usdInrRate ? Number(transaction.usdInrRate) : null
      const newTxnRate = data.usdInrRate !== undefined ? data.usdInrRate : oldTxnRate

      if (oldTxnRate && holding.usdInrRate) {
        // Remove old transaction's contribution
        const holdingRate = Number(holding.usdInrRate)
        let rateWithoutOldTxn = 0

        if (qtyWithoutOldTxn > 0) {
          rateWithoutOldTxn = (holdingQty * holdingRate - oldTxnQty * oldTxnRate) / qtyWithoutOldTxn
        }

        // Apply new transaction's rate
        if (newTxnRate) {
          if (qtyWithoutOldTxn === 0) {
            newUsdInrRate = newTxnRate
          } else {
            newUsdInrRate = (qtyWithoutOldTxn * rateWithoutOldTxn + newTxnQty * newTxnRate) / newQty
          }
        }
      }
    }

    // Calculate new amount and amountInr based on currency
    let newAmount = data.amount ?? Number(transaction.amount)
    let newAmountInr = data.amountInr !== undefined ? data.amountInr : (transaction.amountInr ? Number(transaction.amountInr) : null)
    const newCurrency = data.currency ?? transaction.currency
    const txnUsdInrRate = data.usdInrRate !== undefined ? data.usdInrRate : (transaction.usdInrRate ? Number(transaction.usdInrRate) : null)

    // Recalculate amount/amountInr if qty or price changed
    if (data.qty !== undefined || data.price !== undefined) {
      if (newCurrency === "USD" && txnUsdInrRate) {
        newAmount = newTxnQty * newTxnPrice
        if (!newAmountInr) {
          newAmountInr = newAmount * txnUsdInrRate
        }
      } else {
        newAmount = newTxnQty * newTxnPrice
      }
    }

    // Update both transaction and holding in a transaction
    const [updatedTransaction] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id },
        data: {
          qty: newTxnQty,
          price: newTxnPrice,
          amount: newAmount,
          currency: newCurrency,
          amountInr: newAmountInr,
          usdInrRate: txnUsdInrRate,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          description: data.description,
        },
      }),
      prisma.holding.update({
        where: { id: holding.id },
        data: {
          qty: newQty,
          avgCost: newAvgCost,
          usdInrRate: newUsdInrRate,
          updatedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}
