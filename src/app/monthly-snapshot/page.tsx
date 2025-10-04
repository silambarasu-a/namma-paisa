"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Calendar, Lock, Unlock, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Receipt } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LoanData {
  loanId: string
  loanType: string
  institution: string
  emiAmount: number
  isPaid: boolean
  paidDate: string | null
  dueDate: string | null
  isClosed: boolean
  closedAt: string | null
}

interface MonthlySnapshot {
  id: string
  month: number
  year: number
  salary: number
  taxAmount: number
  afterTax: number
  totalLoans: number
  totalSIPs: number
  totalExpenses: number
  expectedExpenses: number
  unexpectedExpenses: number
  needsExpenses: number
  avoidExpenses: number
  availableAmount: number
  spentAmount: number
  surplusAmount: number
  previousSurplus: number
  investmentsMade: number | null
  loansData?: LoanData[]
  isClosed: boolean
  closedAt: string | null
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function MonthlySnapshotPage() {
  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Helper function to format currency or show dash for zero values
  const formatAmount = (amount: number, showZero = false) => {
    if (amount === 0 && !showZero) return "-"
    return `₹${amount.toLocaleString()}`
  }
  const [isClosing, setIsClosing] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)

  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    loadSnapshot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear])

  const loadSnapshot = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/monthly-snapshot?month=${selectedMonth}&year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setSnapshot(data)
      } else {
        setSnapshot(null)
      }
    } catch (error) {
      console.error("Error loading snapshot:", error)
      toast.error("Failed to load monthly snapshot")
      setSnapshot(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseMonth = async () => {
    try {
      setIsClosing(true)
      const response = await fetch("/api/monthly-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      })

      if (response.ok) {
        toast.success("Month closed successfully")
        loadSnapshot()
        setShowCloseDialog(false)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to close month")
      }
    } catch (error) {
      console.error("Error closing month:", error)
      toast.error("An error occurred")
    } finally {
      setIsClosing(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Monthly Snapshot</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and close your monthly finances
          </p>
        </div>

        {/* Month/Year Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-semibold mb-2">No data available for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Unable to load snapshot data
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalAvailableWithCarryForward = Number(snapshot.availableAmount) + Number(snapshot.previousSurplus)

  return (
    <div className="space-y-4 md:space-y-6 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Monthly Financial Snapshot
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Track and close your monthly finances
        </p>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Select Period</CardTitle>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-[140px] sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px] sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {snapshot.isClosed ? (
              <Badge variant="secondary" className="flex items-center space-x-1 w-fit">
                <Lock className="h-3 w-3" />
                <span>Closed</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center space-x-1 w-fit">
                <Unlock className="h-3 w-3" />
                <span>Active</span>
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {formatAmount(snapshot.salary)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gross income</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available (with carry forward)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatAmount(totalAvailableWithCarryForward, true)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              After deductions {snapshot.previousSurplus > 0 ? `+ ${formatAmount(snapshot.previousSurplus)} carried forward` : ''}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${snapshot.surplusAmount >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'} sm:col-span-2 lg:col-span-1`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <span>Month Surplus</span>
              {snapshot.surplusAmount >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${snapshot.surplusAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {snapshot.surplusAmount === 0 ? '-' : `${snapshot.surplusAmount >= 0 ? '+' : ''}₹${Math.abs(snapshot.surplusAmount).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available - Spent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses & Investments Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Summary</CardTitle>
          <CardDescription>Complete breakdown of monthly spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl sm:text-2xl font-bold">{formatAmount(snapshot.totalExpenses)}</p>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">SIP Investments</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatAmount(snapshot.totalSIPs)}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">One-Time Investments</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatAmount(snapshot.investmentsMade || 0)}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">Remaining</p>
                <p className={`text-xl sm:text-2xl font-bold ${snapshot.surplusAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatAmount(totalAvailableWithCarryForward - snapshot.spentAmount, true)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Expected</p>
                  <Badge variant="secondary" className="text-xs">Planned</Badge>
                </div>
                <p className="text-lg sm:text-xl font-semibold">{formatAmount(snapshot.expectedExpenses)}</p>
              </div>

              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Unexpected</p>
                  <Badge variant="destructive" className="text-xs">Unplanned</Badge>
                </div>
                <p className="text-lg sm:text-xl font-semibold">{formatAmount(snapshot.unexpectedExpenses)}</p>
              </div>

              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Needs</p>
                  <Badge variant="outline" className="text-xs text-green-600">Essential</Badge>
                </div>
                <p className="text-lg sm:text-xl font-semibold">{formatAmount(snapshot.needsExpenses)}</p>
              </div>

              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Avoid</p>
                  <Badge variant="outline" className="text-xs text-red-600">Non-Essential</Badge>
                </div>
                <p className="text-lg sm:text-xl font-semibold">{formatAmount(snapshot.avoidExpenses)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Tracking - Only show if there are loans */}
      {snapshot.loansData && snapshot.loansData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loan EMI Tracking</CardTitle>
            <CardDescription>EMI payment status for {MONTHS[selectedMonth - 1]} {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {snapshot.loansData.map((loan) => (
                <div
                  key={loan.loanId}
                  className={`p-4 rounded-lg border-l-4 ${
                    loan.isPaid
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold text-base">{loan.loanType.replace(/_/g, ' ')}</h4>
                        {loan.isClosed && (
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            Loan Closed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{loan.institution}</p>
                      {loan.dueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {new Date(loan.dueDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                      {loan.isClosed && loan.closedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Closed on: {new Date(loan.closedAt).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        ₹{loan.emiAmount.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1 justify-start sm:justify-end">
                        {loan.isPaid ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">Paid</span>
                            {loan.paidDate && (
                              <span className="text-xs text-muted-foreground">
                                on {new Date(loan.paidDate).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-semibold text-orange-600">Unpaid</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Total EMI this month:</strong> ₹{snapshot.totalLoans.toLocaleString()}
                  <span className="ml-2 text-xs">
                    ({snapshot.loansData.filter(l => l.isPaid).length} of {snapshot.loansData.length} paid)
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Details - Only show if investments were made */}
      {(snapshot.investmentsMade ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Investment Activity
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Breakdown of all investments made this month
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => window.location.href = `/investments/transactions?month=${selectedMonth}&year=${selectedYear}`}
              >
                View Full History
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Investments Made</p>
                    <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{(snapshot.investmentsMade ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      One-time purchases and SIP executions combined
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">SIP Deductions</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                      ₹{snapshot.totalSIPs.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recurring investments
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">One-Time Purchases</span>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Manual
                    </Badge>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                    ₹{((snapshot.investmentsMade ?? 0) - (snapshot.totalSIPs ?? 0)).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From current month salary
                  </p>
                </div>

                <div className="p-3 border rounded-lg bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">Automated SIPs</span>
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      Auto
                    </Badge>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">
                    ₹{snapshot.totalSIPs.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scheduled recurring investments
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>Tip:</strong> View detailed transaction history including holdings updated,
                  quantities purchased, and execution dates in the{" "}
                  <a
                    href={`/investments/transactions?month=${selectedMonth}&year=${selectedYear}`}
                    className="underline font-medium hover:text-blue-700"
                  >
                    Transaction History
                  </a>{" "}
                  page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!snapshot.isClosed && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <span>Close & Save This Month</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Closing will save the snapshot, lock all data, and carry forward the surplus to next month. Currently viewing preview data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowCloseDialog(true)}
              className="w-full"
              disabled={isClosing}
            >
              <Lock className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Close & Save {MONTHS[selectedMonth - 1]} {selectedYear}</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {snapshot.isClosed && snapshot.closedAt && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <p className="font-semibold">
                Month closed on {formatDate(snapshot.closedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Month Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {MONTHS[selectedMonth - 1]} {selectedYear}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently lock the month&apos;s data.{" "}
              {snapshot.surplusAmount !== 0 && (
                <>
                  The surplus amount of{" "}
                  <span className="font-bold text-foreground">
                    {snapshot.surplusAmount >= 0 ? '+' : ''}₹{Math.abs(snapshot.surplusAmount).toLocaleString()}
                  </span>{" "}
                  will be carried forward to the next month.
                </>
              )}
              <br /><br />
              You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseMonth} disabled={isClosing}>
              {isClosing ? "Closing..." : "Close Month"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
