"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, Receipt, Calculator, Wallet, Repeat, PieChart, TrendingUp, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface InvestmentAllocation {
  bucket: string
  amount: number
}

interface FinancialSummary {
  afterTax: number
  afterLoans: number
  afterSIPs: number
  availableForInvestment: number
  availableForExpenses: number
  availableSurplus: number
  surplus: number
  investmentAllocationBreakdown: InvestmentAllocation[]
  isUsingBudget: boolean
  expectedBudget?: number
  unexpectedBudget?: number
}

interface Allocation {
  bucket: string
  allocationType: "PERCENTAGE" | "AMOUNT"
  percent: number | null
  customAmount: number | null
}

interface SalaryFlowPipelineProps {
  totalIncome: number
  salary: number
  additionalIncome: { totalIncome: number; count: number }
  taxAmount: number
  taxPercentage: number
  afterTax: number
  loansData: {
    currentMonthTotalEMI: number
    currentMonthEMICount: number
    unpaidEMICount: number
  }
  afterLoans: number
  sipsData: { totalAmount: number; count: number }
  afterSIPs: number
  financialSummary: FinancialSummary
  allocations: Allocation[]
  hasAllocations: boolean
  expensesData: { totalExpenses: number }
  surplus: number
  selectedMonth: number
  selectedYear: number
}

export function SalaryFlowPipeline({
  totalIncome,
  salary,
  additionalIncome,
  taxAmount,
  taxPercentage,
  loansData,
  sipsData,
  financialSummary,
  allocations,
  hasAllocations,
  expensesData,
  surplus,
  selectedMonth,
  selectedYear,
}: SalaryFlowPipelineProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>

      {/* Header */}
      <div
        className="relative flex items-center justify-between gap-3 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Salary Flow Pipeline
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Complete breakdown of how your salary is distributed
            </p>
          </div>
        </div>

        {/* Summary Pills */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <div className="px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">
              Income: ₹{totalIncome.toLocaleString()}
            </p>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full border",
            surplus >= 0
              ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700"
              : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700"
          )}>
            <p className={cn(
              "text-xs font-semibold",
              surplus >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
            )}>
              Surplus: {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expandable Flow Details - Compact Zig-zag Cards */}
      {isExpanded && (
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-b from-gray-50/80 to-white/80 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Income Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-green-50/90 to-green-100/70 dark:from-green-900/30 dark:to-green-800/20 backdrop-blur-sm rounded-xl border-2 border-green-200 dark:border-green-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                  {new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'short' })}
                </span>
              </div>
              <h4 className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Total Income</h4>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                ₹{totalIncome.toLocaleString('en-IN')}
              </p>
              {additionalIncome.count > 0 && (
                <div className="text-xs text-green-600/80 dark:text-green-400/80 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Salary:</span>
                    <span className="font-semibold">₹{salary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other:</span>
                    <span className="font-semibold">₹{additionalIncome.totalIncome.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tax Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-red-50/90 to-red-100/70 dark:from-red-900/30 dark:to-red-800/20 backdrop-blur-sm rounded-xl border-2 border-red-200 dark:border-red-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                <Badge variant="destructive" className="text-xs">{taxPercentage.toFixed(1)}%</Badge>
              </div>
              <h4 className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Tax Deduction</h4>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                -₹{taxAmount.toLocaleString('en-IN')}
              </p>
              <div className="text-xs text-red-600/80 dark:text-red-400/80 mt-auto">
                <div className="flex justify-between items-center pt-2 border-t border-red-200 dark:border-red-700">
                  <span>After Tax:</span>
                  <span className="font-semibold">₹{financialSummary.afterTax.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Loans Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-orange-50/90 to-orange-100/70 dark:from-orange-900/30 dark:to-orange-800/20 backdrop-blur-sm rounded-xl border-2 border-orange-200 dark:border-orange-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                <Badge variant="secondary" className="text-xs">{loansData.currentMonthEMICount} EMIs</Badge>
              </div>
              <h4 className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">Loan EMIs</h4>
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                -₹{loansData.currentMonthTotalEMI.toLocaleString('en-IN')}
              </p>
              <div className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-auto">
                <div className="flex justify-between items-center">
                  <span>{loansData.unpaidEMICount} unpaid</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-orange-200 dark:border-orange-700">
                  <span>After EMI:</span>
                  <span className="font-semibold">₹{financialSummary.afterLoans.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* SIPs Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-purple-50/90 to-purple-100/70 dark:from-purple-900/30 dark:to-purple-800/20 backdrop-blur-sm rounded-xl border-2 border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <Repeat className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                <Badge variant="secondary" className="text-xs">{sipsData.count} active</Badge>
              </div>
              <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Active SIPs</h4>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                -₹{sipsData.totalAmount.toLocaleString('en-IN')}
              </p>
              <div className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-auto">
                <div className="flex justify-between items-center pt-2 border-t border-purple-200 dark:border-purple-700">
                  <span>After SIPs:</span>
                  <span className="font-semibold">₹{financialSummary.afterSIPs.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Available Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-blue-50/90 to-blue-100/70 dark:from-blue-900/30 dark:to-blue-800/20 backdrop-blur-sm rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Available Surplus</h4>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                ₹{financialSummary.availableSurplus.toLocaleString('en-IN')}
              </p>
              <div className="text-xs text-blue-600/80 dark:text-blue-400/80">
                <p>After tax, EMI & SIPs</p>
                <p className="text-xs mt-1">For expenses & investments</p>
              </div>
            </div>

            {/* Expense Budget Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-yellow-50/90 to-yellow-100/70 dark:from-yellow-900/30 dark:to-yellow-800/20 backdrop-blur-sm rounded-xl border-2 border-yellow-200 dark:border-yellow-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                {financialSummary.isUsingBudget && (
                  <Badge variant="secondary" className="text-xs">Budget Set</Badge>
                )}
              </div>
              <h4 className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">Expense Budget</h4>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                ₹{financialSummary.availableForExpenses.toLocaleString('en-IN')}
              </p>
              {financialSummary.isUsingBudget && (
                <div className="text-xs text-yellow-600/80 dark:text-yellow-400/80 space-y-0.5 mt-auto pt-2 border-t border-yellow-200 dark:border-yellow-700">
                  <div className="flex justify-between">
                    <span>Expected:</span>
                    <span className="font-semibold">₹{(financialSummary.expectedBudget ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unexpected:</span>
                    <span className="font-semibold">₹{(financialSummary.unexpectedBudget ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Investment Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-indigo-50/90 to-indigo-100/70 dark:from-indigo-900/30 dark:to-indigo-800/20 backdrop-blur-sm rounded-xl border-2 border-indigo-200 dark:border-indigo-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <PieChart className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" />
                {hasAllocations && (
                  <Badge variant="secondary" className="text-xs">{allocations.length} buckets</Badge>
                )}
              </div>
              <h4 className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">Investment Allocation</h4>
              <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                ₹{financialSummary.availableForInvestment.toLocaleString('en-IN')}
              </p>
              <div className="text-xs text-indigo-600/80 dark:text-indigo-400/80">
                {hasAllocations ? (
                  <p>Allocated to {allocations.length} bucket{allocations.length > 1 ? 's' : ''}</p>
                ) : (
                  <p>No allocation set</p>
                )}
              </div>
            </div>

            {/* Expenses Card */}
            <div className="flex flex-col p-3 sm:p-4 bg-gradient-to-br from-rose-50/90 to-rose-100/70 dark:from-rose-900/30 dark:to-rose-800/20 backdrop-blur-sm rounded-xl border-2 border-rose-200 dark:border-rose-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h4 className="text-xs font-medium text-rose-700 dark:text-rose-300 mb-1">Total Expenses</h4>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mb-1">
                -₹{expensesData.totalExpenses.toLocaleString('en-IN')}
              </p>
              <div className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-auto">
                <div className="flex justify-between items-center pt-2 border-t border-rose-200 dark:border-rose-700">
                  <span>Remaining:</span>
                  <span className="font-semibold">₹{(financialSummary.availableForExpenses - expensesData.totalExpenses).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Final Surplus Card */}
            <div className={cn(
              "flex flex-col p-3 sm:p-4 backdrop-blur-sm rounded-xl border-2 hover:shadow-lg transition-all",
              surplus >= 0
                ? "bg-gradient-to-br from-emerald-50/90 to-emerald-100/70 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700"
                : "bg-gradient-to-br from-red-50/90 to-red-100/70 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-700"
            )}>
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6",
                  surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )} />
                <Badge className={cn(
                  "text-xs",
                  surplus >= 0 ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200" : "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200"
                )}>
                  {surplus >= 0 ? 'Positive' : 'Deficit'}
                </Badge>
              </div>
              <h4 className={cn(
                "text-xs font-medium mb-1",
                surplus >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
              )}>Final Surplus</h4>
              <p className={cn(
                "text-xl sm:text-2xl font-bold mb-2",
                surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString('en-IN')}
              </p>
              <div className={cn(
                "text-xs",
                surplus >= 0 ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-red-600/80 dark:text-red-400/80"
              )}>
                <p>After all deductions & expenses</p>
              </div>
            </div>
          </div>

          {/* Investment Allocations Breakdown */}
          {hasAllocations && financialSummary.investmentAllocationBreakdown.length > 0 && (
            <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200/50 dark:border-indigo-700/50">
              <h4 className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-2">Investment Allocation Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {financialSummary.investmentAllocationBreakdown.map((alloc) => (
                  <Badge key={alloc.bucket} variant="outline" className="text-xs">
                    {alloc.bucket.replace(/_/g, ' ')}: ₹{alloc.amount.toLocaleString('en-IN')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
