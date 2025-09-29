"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { TrendingUp, TrendingDown, PlusCircle, Trash2 } from "lucide-react"

interface Holding {
  id: string
  bucket: string
  symbol: string
  name: string
  qty: number
  avgCost: number
  currentPrice: number | null
  currency: string
}

const BUCKET_LABELS: Record<string, string> = {
  MUTUAL_FUND: "Mutual Funds",
  IND_STOCK: "Indian Stocks",
  US_STOCK: "US Stocks",
  CRYPTO: "Cryptocurrency",
  EMERGENCY_FUND: "Emergency Fund",
}

export default function HoldingsPage() {
  const searchParams = useSearchParams()
  const bucketFilter = searchParams.get("bucket")

  const [holdings, setHoldings] = useState<Holding[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadHoldings()
  }, [bucketFilter])

  const loadHoldings = async () => {
    try {
      const url = bucketFilter
        ? `/api/investments/holdings?bucket=${bucketFilter}`
        : "/api/investments/holdings"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setHoldings(data)
      } else {
        toast.error("Failed to load holdings")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holding?")) return

    try {
      const response = await fetch(`/api/investments/holdings/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Holding deleted successfully")
        loadHoldings()
      } else {
        toast.error("Failed to delete holding")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const calculatePL = (holding: Holding) => {
    if (!holding.currentPrice) return { amount: 0, percent: 0 }
    const totalCost = holding.avgCost * holding.qty
    const currentValue = holding.currentPrice * holding.qty
    const amount = currentValue - totalCost
    const percent = (amount / totalCost) * 100
    return { amount, percent }
  }

  const calculateTotalPL = () => {
    let totalCost = 0
    let totalValue = 0

    holdings.forEach((holding) => {
      totalCost += holding.avgCost * holding.qty
      if (holding.currentPrice) {
        totalValue += holding.currentPrice * holding.qty
      } else {
        totalValue += holding.avgCost * holding.qty
      }
    })

    const pl = totalValue - totalCost
    const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0
    return { totalCost, totalValue, pl, plPercent }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const totalPL = calculateTotalPL()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Investment Holdings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {bucketFilter
              ? `Viewing ${BUCKET_LABELS[bucketFilter] || bucketFilter} holdings`
              : "View all your investment holdings"}
          </p>
        </div>
        <Link href="/investments/holdings/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Holding
          </Button>
        </Link>
      </div>

      {holdings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Invested</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPL.totalCost.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPL.totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total P&L</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPL.pl >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalPL.pl >= 0 ? "+" : ""}₹{totalPL.pl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                <span className="text-sm ml-2">({totalPL.plPercent.toFixed(2)}%)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>
            Manage your investment portfolio across different asset classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holdings.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => {
                    const pl = calculatePL(holding)
                    const totalValue = (holding.currentPrice || holding.avgCost) * holding.qty
                    return (
                      <TableRow key={holding.id}>
                        <TableCell>
                          <Badge variant="outline">{BUCKET_LABELS[holding.bucket]}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{holding.symbol}</TableCell>
                        <TableCell>{holding.name}</TableCell>
                        <TableCell className="text-right">{holding.qty.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {holding.currency === "USD" ? "$" : "₹"}
                          {holding.avgCost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.currentPrice
                            ? `${holding.currency === "USD" ? "$" : "₹"}${holding.currentPrice.toLocaleString()}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {holding.currency === "USD" ? "$" : "₹"}
                          {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.currentPrice ? (
                            <div className={pl.amount >= 0 ? "text-green-600" : "text-red-600"}>
                              <div className="flex items-center justify-end space-x-1">
                                {pl.amount >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                <span>
                                  {pl.amount >= 0 ? "+" : ""}
                                  {holding.currency === "USD" ? "$" : "₹"}
                                  {pl.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="text-xs">({pl.percent.toFixed(2)}%)</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(holding.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No holdings found</p>
              <Link href="/investments/holdings/new">
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Your First Holding
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}