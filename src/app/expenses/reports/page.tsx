"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { BarChart, Calendar } from "lucide-react"

interface ExpenseSummary {
  totalExpenses: number
  totalAmount: number
  expectedCount: number
  expectedAmount: number
  unexpectedCount: number
  unexpectedAmount: number
  totalNeedsAmount: number
  totalAvoidAmount: number
}

interface Expense {
  id: string
  date: string
  title: string
  expenseType: string
  category: string
  amount: number
  needsPortion: number | null
  avoidPortion: number | null
}

export default function ExpenseReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/expenses?month=${selectedMonth}&year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])

        // Calculate summary from expenses - matching API logic
        const summary: ExpenseSummary = {
          totalExpenses: data.expenses?.length || 0,
          totalAmount: 0,
          expectedCount: 0,
          expectedAmount: 0,
          unexpectedCount: 0,
          unexpectedAmount: 0,
          totalNeedsAmount: 0,
          totalAvoidAmount: 0,
        }

        data.expenses?.forEach((expense: Expense) => {
          const amount = Number(expense.amount)
          summary.totalAmount += amount

          if (expense.expenseType === "EXPECTED") {
            summary.expectedCount++
            summary.expectedAmount += amount
          } else {
            summary.unexpectedCount++
            summary.unexpectedAmount += amount
          }

          // Match API logic exactly - split partial-needs into needs/avoid portions
          if (expense.category === "NEEDS") {
            summary.totalNeedsAmount += amount
          } else if (expense.category === "PARTIAL_NEEDS") {
            summary.totalNeedsAmount += Number(expense.needsPortion || 0)
            summary.totalAvoidAmount += Number(expense.avoidPortion || 0)
          } else if (expense.category === "AVOID") {
            summary.totalAvoidAmount += amount
          }
        })

        setSummary(summary)
      } else {
        toast.error("Failed to load expense data")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getMonthLabel = () => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`
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

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Expense Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze your spending patterns and expense breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-white/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
              <div className="relative p-5">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Expenses</p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalExpenses}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{getMonthLabel()}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50/80 via-rose-50/60 to-white/60 dark:from-red-900/20 dark:via-rose-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-red-200/50 dark:border-red-700/50 shadow-xl hover:shadow-2xl transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>
              <div className="relative p-5">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Amount</p>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ₹{summary.totalAmount.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{getMonthLabel()}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-cyan-50/60 to-white/60 dark:from-blue-900/20 dark:via-cyan-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
              <div className="relative p-5">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Expected Expenses</p>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ₹{summary.expectedAmount.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {summary.expectedCount} expenses
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50/80 via-amber-50/60 to-white/60 dark:from-orange-900/20 dark:via-amber-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-orange-200/50 dark:border-orange-700/50 shadow-xl hover:shadow-2xl transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
              <div className="relative p-5">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Unexpected Expenses</p>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ₹{summary.unexpectedAmount.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {summary.unexpectedCount} expenses
                </p>
              </div>
            </div>
          </div>

          {/* Needs vs Avoid Analysis */}
          <div className="relative overflow-hidden rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-red-500/5 pointer-events-none"></div>
            <div className="relative p-6">
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-1">
                  <BarChart className="h-5 w-5 text-gray-900 dark:text-white" />
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">Needs vs Avoid Analysis</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expense breakdown by needs and avoid categories (partial-needs are split)</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Needs</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      ₹{summary.totalNeedsAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${summary.totalAmount > 0 ? (summary.totalNeedsAmount / summary.totalAmount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.totalAmount > 0
                      ? ((summary.totalNeedsAmount / summary.totalAmount) * 100).toFixed(1)
                      : 0}% of total expenses
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Avoid</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      ₹{summary.totalAvoidAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${summary.totalAmount > 0 ? (summary.totalAvoidAmount / summary.totalAmount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.totalAmount > 0
                      ? ((summary.totalAvoidAmount / summary.totalAmount) * 100).toFixed(1)
                      : 0}% of total expenses
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-xs text-muted-foreground">
                    Note: Partial-needs expenses are split proportionally between needs and avoid categories based on the allocation you specified when creating the expense.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Expense List */}
          <div className="relative overflow-hidden rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
            <div className="relative p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Details</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">All expenses for {getMonthLabel()}</p>
              </div>
              {expenses.length > 0 ? (
                <div className="overflow-x-auto rounded-md border border-gray-200/50 dark:border-gray-700/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Needs</TableHead>
                        <TableHead className="text-right">Avoid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-sm">
                            {new Date(expense.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{expense.title}</TableCell>
                          <TableCell>
                            <Badge variant={expense.expenseType === "EXPECTED" ? "secondary" : "destructive"}>
                              {expense.expenseType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{Number(expense.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            {expense.category === "NEEDS"
                              ? `₹${Number(expense.amount).toLocaleString()}`
                              : expense.category === "PARTIAL_NEEDS"
                              ? `₹${Number(expense.needsPortion || 0).toLocaleString()}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400">
                            {expense.category === "AVOID"
                              ? `₹${Number(expense.amount).toLocaleString()}`
                              : expense.category === "PARTIAL_NEEDS"
                              ? `₹${Number(expense.avoidPortion || 0).toLocaleString()}`
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses found for this period
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}