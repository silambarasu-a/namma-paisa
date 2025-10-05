"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Wallet } from "lucide-react"

interface EMI {
  id: string
  dueDate: Date
  emiAmount: number
  isPaid: boolean
}

interface Loan {
  id: string
  loanType: string
  institution: string
  emis: EMI[]
}

interface UpcomingEMIProps {
  loans: Loan[]
  monthName: string
  selectedYear: number
}

export function UpcomingEMI({ loans, monthName, selectedYear }: UpcomingEMIProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Flatten all EMIs from all loans and sort by amount ascending
  const allEMIs = loans.flatMap(loan =>
    loan.emis.map(emi => ({
      ...emi,
      loanType: loan.loanType,
      institution: loan.institution
    }))
  ).sort((a, b) => Number(a.emiAmount) - Number(b.emiAmount))

  // Calculate total current month EMI
  const currentMonthTotal = allEMIs.reduce((sum, emi) => sum + Number(emi.emiAmount), 0)

  return (
    <div className={`relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 ${
      !isExpanded ? 'h-auto' : ''
    }`}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>

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
          <div className={`rounded-full bg-orange-100/80 dark:bg-orange-900/40 backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/50 flex items-center justify-center shrink-0 transition-all duration-200 ${
            isExpanded ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-6 w-6'
          }`}>
            <Wallet className={`text-orange-600 dark:text-orange-400 transition-all duration-200 ${
              isExpanded ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3.5 w-3.5'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-gray-900 dark:text-white transition-all duration-200 ${
              isExpanded ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
            }`}>Current Month EMI</h3>
            {isExpanded && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">All EMIs for {monthName} {selectedYear}</p>
            )}
          </div>
        </div>

        {/* Summary Badges - Show when collapsed */}
        {!isExpanded && (
          <div className="flex items-center">
            <div className="px-2 py-0.5 rounded-full bg-orange-50/80 dark:bg-orange-900/30 backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/50">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                ₹{currentMonthTotal.toLocaleString('en-IN')}
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
          {allEMIs.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {allEMIs.map((emi) => {
                const isPaid = emi.isPaid
                const borderColor = isPaid
                  ? 'border-green-200/50 dark:border-green-700/50'
                  : 'border-gray-200/50 dark:border-gray-700/50'
                const amountColor = isPaid
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-orange-600 dark:text-orange-400'

                return (
                  <div key={emi.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg border ${borderColor}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm sm:text-base break-words">{emi.loanType.replace('_', ' ')}</p>
                        {isPaid && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                            Paid
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-muted-foreground break-words">{emi.institution}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(emi.dueDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className={`font-bold text-base sm:text-lg break-words ${amountColor}`}>₹{Number(emi.emiAmount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">No EMIs due this month</p>
          )}
        </div>
      )}
    </div>
  )
}
