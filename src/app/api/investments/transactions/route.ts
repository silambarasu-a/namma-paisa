import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, InvestBucket, TransactionType } from "@/generated/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const bucket = searchParams.get("bucket")
    const type = searchParams.get("type")

    // Build where clause
    const where: Prisma.TransactionWhereInput = { userId: session.user.id }

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

      where.purchaseDate = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Filter by bucket
    if (bucket && Object.values(InvestBucket).includes(bucket as InvestBucket)) {
      where.bucket = bucket as InvestBucket
    }

    // Filter by transaction type
    if (type && Object.values(TransactionType).includes(type as TransactionType)) {
      where.transactionType = type as TransactionType
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { purchaseDate: "desc" },
      include: {
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
    const serializedTransactions = transactions.map(txn => ({
      ...txn,
      qty: Number(txn.qty),
      price: Number(txn.price),
      amount: Number(txn.amount),
      purchaseDate: txn.purchaseDate.toISOString(),
      createdAt: txn.createdAt.toISOString(),
      updatedAt: txn.updatedAt.toISOString(),
    }))

    return NextResponse.json(serializedTransactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}
