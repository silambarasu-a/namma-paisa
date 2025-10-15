"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ShoppingCart, Repeat, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface InvestmentTrackingProps {
  holdingsData: {
    count: number
    totalInvestment: number
    totalCurrentValue: number
    totalPL: number
  }
  plannedInvestments: {
    sips: number
    sipCount: number
  }
  actualInvestments: {
    oneTime: number
    oneTimeCount: number
    sipExecutions: number
    sipExecutionCount: number
  }
  currentMonthReturns: {
    invested: number
    currentValue: number
    returns: number
    returnPercentage: number
    transactionCount: number
  }
  monthName: string
  year: number
}

export function InvestmentTracking({
  holdingsData: initialHoldingsData,
  plannedInvestments,
  actualInvestments,
  currentMonthReturns,
  monthName,
  year,
}: InvestmentTrackingProps) {
  const [holdingsData, setHoldingsData] = useState(initialHoldingsData)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchCurrentPrices = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/investments/holdings/refresh-prices', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.holdingsData) {
          setHoldingsData(data.holdingsData)
          toast.success(`Prices updated successfully! (${data.updated} updated, ${data.failed} failed)`)
        } else {
          // Fallback to full page reload if data structure changed
          window.location.reload()
        }
      } else {
        toast.error('Failed to refresh prices')
      }
    } catch (error) {
      console.error('Failed to fetch current prices:', error)
      toast.error('Failed to refresh prices')
    } finally {
      setIsRefreshing(false)
    }
  }
  const totalPlanned = plannedInvestments.sips
  const totalActual = actualInvestments.oneTime + actualInvestments.sipExecutions
  const plPercentage = holdingsData.totalInvestment > 0
    ? (holdingsData.totalPL / holdingsData.totalInvestment) * 100
    : 0

  return (
    <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>

      {/* Header */}
      <div className="relative p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <PieChart className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Investment Tracking
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {monthName} {year} • Portfolio & Transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {holdingsData.count > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchCurrentPrices}
                  disabled={isRefreshing}
                  className="text-xs"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
                <Badge variant="outline" className="text-xs">
                  {holdingsData.count} holding{holdingsData.count !== 1 ? 's' : ''}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="relative p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Portfolio Value Card */}
          <div className="flex flex-col p-4 bg-gradient-to-br from-indigo-50/90 to-indigo-100/70 dark:from-indigo-900/30 dark:to-indigo-800/20 backdrop-blur-sm rounded-xl border-2 border-indigo-200 dark:border-indigo-700 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <PieChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <Badge variant="secondary" className="text-xs">Total</Badge>
            </div>
            <h4 className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">Portfolio Value</h4>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              ₹{holdingsData.totalCurrentValue.toLocaleString('en-IN')}
            </p>
            <div className="text-xs space-y-1 mt-auto pt-2 border-t border-indigo-200 dark:border-indigo-700">
              <div className="flex justify-between">
                <span className="text-indigo-600/80 dark:text-indigo-400/80">Invested:</span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">₹{holdingsData.totalInvestment.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-600/80 dark:text-indigo-400/80">P&L:</span>
                <span className={cn(
                  "font-bold flex items-center gap-1",
                  holdingsData.totalPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {holdingsData.totalPL >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {holdingsData.totalPL >= 0 ? '+' : ''}₹{holdingsData.totalPL.toLocaleString('en-IN')}
                  <span className="text-[10px]">({plPercentage.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Planned Investments Card */}
          <div className="flex flex-col p-4 bg-gradient-to-br from-blue-50/90 to-blue-100/70 dark:from-blue-900/30 dark:to-blue-800/20 backdrop-blur-sm rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-800">SIPs</Badge>
            </div>
            <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">SIP Investments</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              ₹{actualInvestments.sipExecutions.toLocaleString('en-IN')}
            </p>
            <div className="text-xs space-y-1 mt-auto pt-2 border-t border-blue-200 dark:border-blue-700">
              <div className="flex justify-between">
                <span className="text-blue-600/80 dark:text-blue-400/80">Planned:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">₹{totalPlanned.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600/80 dark:text-blue-400/80">Executed:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">{actualInvestments.sipExecutionCount} time{actualInvestments.sipExecutionCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Unplanned Investments Card */}
          <div className="flex flex-col p-4 bg-gradient-to-br from-violet-50/90 to-violet-100/70 dark:from-violet-900/30 dark:to-violet-800/20 backdrop-blur-sm rounded-xl border-2 border-violet-200 dark:border-violet-700 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <Badge variant="secondary" className="text-xs bg-violet-100 dark:bg-violet-800">Unplanned</Badge>
            </div>
            <h4 className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">One-Time Purchases</h4>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mb-2">
              ₹{actualInvestments.oneTime.toLocaleString('en-IN')}
            </p>
            <div className="text-xs mt-auto">
              {actualInvestments.oneTimeCount > 0 ? (
                <p className="text-violet-600/80 dark:text-violet-400/80">
                  {actualInvestments.oneTimeCount} transaction{actualInvestments.oneTimeCount !== 1 ? 's' : ''} this month
                </p>
              ) : (
                <p className="text-violet-600/80 dark:text-violet-400/80">No purchases</p>
              )}
            </div>
          </div>

          {/* This Month's Investments Card */}
          <div className="flex flex-col p-4 bg-gradient-to-br from-teal-50/90 to-teal-100/70 dark:from-teal-900/30 dark:to-teal-800/20 backdrop-blur-sm rounded-xl border-2 border-teal-200 dark:border-teal-700 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <Badge className="text-xs bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200">
                This Month
              </Badge>
            </div>
            <h4 className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-1">Total Invested</h4>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-2">
              ₹{totalActual.toLocaleString('en-IN')}
            </p>
            <div className="text-xs space-y-1 mt-auto pt-2 border-t border-teal-200 dark:border-teal-700">
              <div className="flex justify-between">
                <span className="text-teal-600/80 dark:text-teal-400/80">SIPs:</span>
                <span className="font-semibold text-teal-700 dark:text-teal-300">₹{actualInvestments.sipExecutions.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-600/80 dark:text-teal-400/80">One-time:</span>
                <span className="font-semibold text-teal-700 dark:text-teal-300">₹{actualInvestments.oneTime.toLocaleString('en-IN')}</span>
              </div>
              {currentMonthReturns.transactionCount > 0 && (
                <div className="pt-1 border-t border-teal-200 dark:border-teal-700">
                  <div className={cn(
                    "flex items-center gap-1 font-semibold",
                    currentMonthReturns.returns >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {currentMonthReturns.returns >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span className="text-[10px]">
                      {currentMonthReturns.returns >= 0 ? '+' : ''}₹{currentMonthReturns.returns.toLocaleString('en-IN')} ({currentMonthReturns.returnPercentage >= 0 ? '+' : ''}{currentMonthReturns.returnPercentage.toFixed(2)}%) current value
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Summary Notes */}
        <div className="mt-4 space-y-2">
          {(actualInvestments.sipExecutions < totalPlanned) && totalPlanned > 0 && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 SIP shortfall: ₹{(totalPlanned - actualInvestments.sipExecutions).toLocaleString('en-IN')} planned SIPs not yet executed this month.
              </p>
            </div>
          )}
          {actualInvestments.oneTime > 0 && (
            <div className="p-3 bg-violet-50/50 dark:bg-violet-900/10 rounded-lg border border-violet-200/50 dark:border-violet-700/50">
              <p className="text-xs text-violet-700 dark:text-violet-300">
                📊 One-time purchases of ₹{actualInvestments.oneTime.toLocaleString('en-IN')} made outside regular SIPs.
              </p>
            </div>
          )}
          {(totalActual > totalPlanned) && totalPlanned > 0 && (
            <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200/50 dark:border-amber-700/50">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                ⚠️ Total investments (₹{totalActual.toLocaleString('en-IN')}) exceeded planned SIPs (₹{totalPlanned.toLocaleString('en-IN')}) by ₹{(totalActual - totalPlanned).toLocaleString('en-IN')}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
