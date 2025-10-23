"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  User,
} from "lucide-react"

interface BorrowedFund {
  id: string
  lenderName: string
  borrowedAmount: number
  returnedAmount: number
  profitLoss: number | null
  investedInHolding: {
    symbol: string
    name: string
  } | null
}

interface BorrowedFundsWidgetProps {
  funds: BorrowedFund[]
}

export function BorrowedFundsWidget({ funds }: BorrowedFundsWidgetProps) {
  const activeFunds = funds.filter(
    (f) => f.borrowedAmount > f.returnedAmount
  )

  const totalBorrowed = activeFunds.reduce(
    (sum, f) => sum + f.borrowedAmount,
    0
  )
  const totalReturned = activeFunds.reduce(
    (sum, f) => sum + f.returnedAmount,
    0
  )
  const totalOutstanding = totalBorrowed - totalReturned
  const totalProfit = activeFunds.reduce(
    (sum, f) => sum + (f.profitLoss || 0),
    0
  )

  if (activeFunds.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Borrowed Funds
        </CardTitle>
        <Link href="/borrowed-funds">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold">{activeFunds.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-semibold">
              ₹{(totalOutstanding / 1000).toFixed(1)}k
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Profit/Loss</p>
            <p
              className={`text-lg font-semibold flex items-center gap-1 ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {totalProfit >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {totalProfit >= 0 ? "+" : ""}₹{Math.abs(totalProfit).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Recent Funds */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Active Funds</p>
          {activeFunds.slice(0, 3).map((fund) => {
            const outstanding = fund.borrowedAmount - fund.returnedAmount
            const returnProgress =
              (fund.returnedAmount / fund.borrowedAmount) * 100

            return (
              <div
                key={fund.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-medium truncate">
                      {fund.lenderName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>₹{outstanding.toLocaleString()} outstanding</span>
                    {fund.investedInHolding && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {fund.investedInHolding.symbol}
                        </span>
                      </>
                    )}
                  </div>
                  {returnProgress > 0 && (
                    <div className="mt-2">
                      <div className="h-1 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${returnProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {returnProgress.toFixed(0)}% returned
                      </p>
                    </div>
                  )}
                </div>
                {fund.profitLoss !== null && fund.profitLoss !== 0 && (
                  <Badge
                    variant={fund.profitLoss >= 0 ? "default" : "destructive"}
                    className="ml-2 flex-shrink-0"
                  >
                    {fund.profitLoss >= 0 ? "+" : ""}₹
                    {Math.abs(fund.profitLoss).toLocaleString()}
                  </Badge>
                )}
              </div>
            )
          })}
          {activeFunds.length > 3 && (
            <Link href="/borrowed-funds">
              <Button variant="outline" size="sm" className="w-full">
                View {activeFunds.length - 3} more
              </Button>
            </Link>
          )}
        </div>

        {/* Impact Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Borrowed</span>
            <span className="font-semibold">
              ₹{totalBorrowed.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Total Returned</span>
            <span className="font-semibold">
              ₹{totalReturned.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
