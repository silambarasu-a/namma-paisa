"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { TrendingUp, TrendingDown, PlusCircle, Trash2, Wallet, Target, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react"
import type { Holding } from "@/types"
import { BUCKET_LABELS, BUCKET_COLORS } from "@/constants"
import { AddHoldingDialog } from "@/components/AddHoldingDialog"

export default function HoldingsPage() {
  const searchParams = useSearchParams()
  const bucketFilter = searchParams.get("bucket")

  const [holdings, setHoldings] = useState<Holding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    loadHoldings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketFilter])

  const loadHoldings = async () => {
    try {
      const url = bucketFilter
        ? `/api/investments/holdings?bucket=${bucketFilter}`
        : "/api/investments/holdings"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // Convert grouped holdings object to flat array
        let allHoldings = Object.values(data.holdings).flat() as Holding[]

        // Fetch current prices for the current month
        try {
          const pricesResponse = await fetch("/api/investments/holdings/current-prices")
          if (pricesResponse.ok) {
            const pricesData = await pricesResponse.json()
            const currentPrices = pricesData.prices as Record<string, number>

            // Update holdings with current prices
            allHoldings = allHoldings.map(holding => ({
              ...holding,
              currentPrice: currentPrices[holding.id] ?? holding.currentPrice
            }))
          }
        } catch (error) {
          console.error("Failed to fetch current prices:", error)
          // Continue with DB prices if current prices fetch fails
        }

        setHoldings(allHoldings)
      } else {
        toast.error("Failed to load holdings")
      }
    } catch {
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
    } catch {
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

  const getInrValue = (holding: Holding, usdAmount: number) => {
    if (holding.currency === "USD" && holding.usdInrRate) {
      return usdAmount * Number(holding.usdInrRate)
    }
    return usdAmount
  }

  const calculateTotalPL = () => {
    let totalCost = 0
    let totalValue = 0

    holdings.forEach((holding) => {
      const cost = holding.avgCost * holding.qty
      const value = holding.currentPrice ? holding.currentPrice * holding.qty : cost

      // Convert to INR if US stock
      totalCost += getInrValue(holding, cost)
      totalValue += getInrValue(holding, value)
    })

    const pl = totalValue - totalCost
    const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0
    return { totalCost, totalValue, pl, plPercent }
  }

  const calculateBucketPL = () => {
    const bucketStats: Record<string, { totalCost: number; totalValue: number; pl: number; plPercent: number; count: number }> = {}

    holdings.forEach((holding) => {
      if (!bucketStats[holding.bucket]) {
        bucketStats[holding.bucket] = { totalCost: 0, totalValue: 0, pl: 0, plPercent: 0, count: 0 }
      }

      const cost = holding.avgCost * holding.qty
      const value = (holding.currentPrice || holding.avgCost) * holding.qty

      // Convert to INR if US stock
      bucketStats[holding.bucket].totalCost += getInrValue(holding, cost)
      bucketStats[holding.bucket].totalValue += getInrValue(holding, value)
      bucketStats[holding.bucket].count += 1
    })

    Object.keys(bucketStats).forEach(bucket => {
      const stats = bucketStats[bucket]
      stats.pl = stats.totalValue - stats.totalCost
      stats.plPercent = stats.totalCost > 0 ? (stats.pl / stats.totalCost) * 100 : 0
    })

    return bucketStats
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
  const bucketPL = calculateBucketPL()

  const calculatePortfolioPerformance = () => {
    return (((totalPL.totalValue - totalPL.totalCost) / totalPL.totalCost) * 100).toFixed(2)
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Investment Holdings
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {bucketFilter
              ? `Viewing ${BUCKET_LABELS[bucketFilter] || bucketFilter} holdings`
              : "Track your portfolio performance with detailed P&L analysis"}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Holding
        </Button>
      </div>

      {holdings.length > 0 && (
        <>
          {/* Portfolio Overview */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-white/60 dark:from-blue-900/20 dark:via-purple-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            <div className="relative p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Portfolio Overview</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete profit & loss summary of your investment portfolio
                </p>
              </div>
              <div className="space-y-6">
                {/* Main P&L Display */}
                <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
                    {/* Total Invested */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Wallet className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Invested</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        ₹{totalPL.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Principal amount invested</p>
                    </div>

                    {/* Current Value */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Current Value</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ₹{totalPL.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalPL.totalCost > 0 ? (
                          <>Worth {calculatePortfolioPerformance()}% of investment</>
                        ) : (
                          <>Current market value</>
                        )}
                      </p>
                    </div>

                    {/* Total P&L */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        {totalPL.pl >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-sm font-medium ${totalPL.pl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          Total Profit & Loss
                        </span>
                      </div>
                      <div className={`text-3xl font-bold ${totalPL.pl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {totalPL.pl >= 0 ? "+" : ""}₹{Math.abs(totalPL.pl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <Badge
                          variant={totalPL.pl >= 0 ? "default" : "destructive"}
                          className={totalPL.pl >= 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                        >
                          {totalPL.pl >= 0 ? "+" : ""}{totalPL.plPercent.toFixed(2)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {totalPL.pl >= 0 ? "Returns" : "Loss"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Portfolio Performance</span>
                      <span className="text-xs font-semibold">{calculatePortfolioPerformance()}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${totalPL.pl >= 0 ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-red-500 to-red-600"}`}
                        style={{
                          width: `${Math.min(Math.max(Number(calculatePortfolioPerformance()), 0), 200)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bucket-wise Breakdown */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                    <PieChart className="h-4 w-4" />
                    <span>Bucket-wise Performance</span>
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(bucketPL).map(([bucket, stats]) => (
                      <div
                        key={bucket}
                        className="p-4 rounded-lg border-2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${BUCKET_COLORS[bucket]}`} />
                            <span className="text-sm font-semibold">{BUCKET_LABELS[bucket]}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">{stats.count} {stats.count === 1 ? 'holding' : 'holdings'}</Badge>
                        </div>

                        <div className="space-y-2 mt-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Invested</span>
                            <span className="font-semibold">₹{stats.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Current</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">₹{stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>

                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stats.pl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                              style={{
                                width: `${Math.min(Math.abs(stats.plPercent), 100)}%`,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className={`text-xs font-bold ${stats.pl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {stats.pl >= 0 ? "+" : ""}₹{Math.abs(stats.pl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <Badge
                              variant={stats.pl >= 0 ? "default" : "destructive"}
                              className={`text-xs ${stats.pl >= 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}`}
                            >
                              {stats.pl >= 0 ? "+" : ""}{stats.plPercent.toFixed(2)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Holdings Detail Table */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Holdings Detail</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Detailed view of all your investment holdings with real-time P&L
              </p>
            </div>
            {holdings.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {holdings.length} {holdings.length === 1 ? 'Holding' : 'Holdings'}
              </Badge>
            )}
          </div>
          {holdings.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="font-semibold">Bucket</TableHead>
                    <TableHead className="font-semibold">Symbol</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="text-right font-semibold">Quantity</TableHead>
                    <TableHead className="text-right font-semibold">Avg Cost</TableHead>
                    <TableHead className="text-right font-semibold">Current Price</TableHead>
                    <TableHead className="text-right font-semibold">Total Value</TableHead>
                    <TableHead className="text-right font-semibold">P&L</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => {
                    const pl = calculatePL(holding)
                    const totalCost = holding.avgCost * holding.qty
                    const totalValue = (holding.currentPrice || holding.avgCost) * holding.qty
                    return (
                      <TableRow key={holding.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${BUCKET_COLORS[holding.bucket]}`} />
                            <Badge variant="outline" className="text-xs">
                              {BUCKET_LABELS[holding.bucket]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">{holding.symbol}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={holding.name}>
                          {holding.name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {holding.qty.toLocaleString(undefined, { maximumFractionDigits: 9 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            {holding.currency === "USD" ? "$" : "₹"}
                            {holding.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total: {holding.currency === "USD" ? "$" : "₹"}
                            {totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          {holding.currency === "USD" && holding.usdInrRate && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              ≈ ₹{getInrValue(holding, totalCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.currentPrice ? (
                            <div>
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {holding.currency === "USD" ? "$" : "₹"}
                                {holding.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </div>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {((holding.currentPrice / holding.avgCost) * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {holding.currency === "USD" ? "$" : "₹"}
                            {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          {holding.currency === "USD" && holding.usdInrRate && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              ≈ ₹{getInrValue(holding, totalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.currentPrice ? (
                            <div className="space-y-1">
                              <div className={`flex items-center justify-end space-x-1 font-bold ${pl.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                {pl.amount >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                <span>
                                  {pl.amount >= 0 ? "+" : ""}
                                  {holding.currency === "USD" ? "$" : "₹"}
                                  {Math.abs(pl.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <Badge
                                variant={pl.amount >= 0 ? "default" : "destructive"}
                                className={`text-xs ${pl.amount >= 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}`}
                              >
                                {pl.amount >= 0 ? "+" : ""}{pl.percent.toFixed(2)}%
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(holding.id)}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Wallet className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">No Holdings Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Start building your investment portfolio by adding your first holding
                  </p>
                </div>
                <Button size="lg" onClick={() => setIsDialogOpen(true)}>
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Add Your First Holding
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddHoldingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadHoldings}
      />
    </div>
  )
}