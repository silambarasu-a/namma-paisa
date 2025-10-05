"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Expense {
  id: string
  title: string
  amount: number
  date: Date
  expenseType: string
  category: string
}

interface RecentExpensesProps {
  expenses: Expense[]
  totalExpenses: number
  monthName: string
  selectedYear: number
}

export function RecentExpenses({ expenses, totalExpenses, monthName, selectedYear }: RecentExpensesProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={`relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 ${
      !isExpanded ? 'h-auto' : ''
    }`}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>

      {/* Header */}
      <div
        className={`relative flex items-center justify-between cursor-pointer transition-all duration-200 ${
          isExpanded ? 'p-4 gap-3' : 'py-2.5 px-3 gap-2'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`flex items-center flex-1 min-w-0 transition-all duration-200 ${
          isExpanded ? 'gap-3' : 'gap-2'
        }`}>
          <div className={`rounded-full bg-red-100/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 flex items-center justify-center shrink-0 transition-all duration-200 ${
            isExpanded ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-6 w-6'
          }`}>
            <Receipt className={`text-red-600 dark:text-red-400 transition-all duration-200 ${
              isExpanded ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3.5 w-3.5'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-gray-900 dark:text-white transition-all duration-200 ${
              isExpanded ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
            }`}>Recent Expenses</h3>
            {isExpanded && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Last 5 expenses for {monthName} {selectedYear}</p>
            )}
          </div>
        </div>

        {/* Summary Badge - Show when collapsed */}
        {!isExpanded && (
          <div className="flex items-center">
            <div className="px-2 py-0.5 rounded-full bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50">
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                ₹{totalExpenses.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Chevron */}
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="relative border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-b from-gray-50/80 to-white/80 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm p-4 sm:p-6">
          {expenses.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base break-words text-blue-700 dark:text-blue-400">{expense.title}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      <Badge variant={expense.expenseType === 'EXPECTED' ? 'secondary' : 'destructive'} className="text-xs">
                        {expense.expenseType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="font-bold text-base sm:text-lg break-words text-red-600 dark:text-red-400">₹{Number(expense.amount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">No expenses recorded yet</p>
          )}
        </div>
      )}
    </div>
  )
}
