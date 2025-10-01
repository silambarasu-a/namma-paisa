"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Receipt, PlusCircle, BarChart3, List, Wallet, Calendar, Filter, TrendingUp, TrendingDown, DollarSign, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

interface AvailableAmount {
  salary: number
  taxAmount: number
  totalLoans: number
  totalSIPs: number
  availableForExpenses: number
  expectedBudget?: number
  unexpectedBudget?: number
  hasBudget?: boolean
}

interface Expense {
  id: string
  date: string
  title: string
  expenseType: "EXPECTED" | "UNEXPECTED"
  category: "NEEDS" | "PARTIAL_NEEDS" | "AVOID"
  amount: number
  needsPortion?: number
  avoidPortion?: number
  paymentMethod: "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER"
  paymentDueDate?: string
  creditCard?: {
    cardName: string
    bank: string
    lastFourDigits: string
    billingCycle: number
    dueDate: number
  }
  createdAt: string
}

interface ExpenseSummary {
  totalExpenses: number
  needsTotal: number
  avoidTotal: number
  expectedTotal: number
  unexpectedTotal: number
  count: number
}

export default function ExpensesPage() {
  const router = useRouter()
  const [available, setAvailable] = useState<AvailableAmount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>("date")

  useEffect(() => {
    loadAvailableAmount()
    fetchExpenses()
  }, [selectedMonth, selectedYear, filter, sortBy])

  const loadAvailableAmount = async () => {
    try {
      setIsLoading(true)

      // Get salary
      const salaryRes = await fetch("/api/profile/salary-history")
      let monthlySalary = 0
      if (salaryRes.ok) {
        const salaryHistory = await salaryRes.json()
        if (salaryHistory && salaryHistory.length > 0) {
          monthlySalary = Number(salaryHistory[0].monthly)
        }
      }

      if (monthlySalary > 0) {
        const calcRes = await fetch("/api/investments/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthly: monthlySalary }),
        })

        if (calcRes.ok) {
          const calcData = await calcRes.json()
          const availableSurplus = monthlySalary - calcData.taxAmount - calcData.totalLoanEMI - calcData.totalSIPAmount

          // Get budget to calculate available for expenses
          const budgetRes = await fetch("/api/expenses/budget")
          let availableForExpenses = availableSurplus // Default to surplus
          let expectedBudget = 0
          let unexpectedBudget = 0
          let hasBudget = false

          if (budgetRes.ok) {
            const budget = await budgetRes.json()

            // Calculate based on budget if set
            if (budget && (budget.expectedPercent || budget.expectedAmount || budget.unexpectedPercent || budget.unexpectedAmount)) {
              hasBudget = true

              if (budget.expectedPercent) {
                expectedBudget = (availableSurplus * budget.expectedPercent) / 100
              } else if (budget.expectedAmount) {
                expectedBudget = budget.expectedAmount
              }

              if (budget.unexpectedPercent) {
                unexpectedBudget = (availableSurplus * budget.unexpectedPercent) / 100
              } else if (budget.unexpectedAmount) {
                unexpectedBudget = budget.unexpectedAmount
              }

              availableForExpenses = expectedBudget + unexpectedBudget
            }
          }

          setAvailable({
            salary: monthlySalary,
            taxAmount: calcData.taxAmount,
            totalLoans: calcData.totalLoanEMI,
            totalSIPs: calcData.totalSIPAmount,
            availableForExpenses,
            expectedBudget,
            unexpectedBudget,
            hasBudget,
          })
        }
      }
    } catch (error) {
      console.error("Error loading available amount:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.append("filter", filter)
      params.append("sortBy", sortBy)
      params.append("month", selectedMonth)
      params.append("year", selectedYear)

      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
    }
  }

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return

    try {
      const response = await fetch(`/api/expenses/${expenseToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Expense deleted successfully!")
        fetchExpenses()
      } else {
        toast.error("Failed to delete expense")
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("An error occurred while deleting the expense")
    } finally {
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
    }
  }

  const openDeleteDialog = (id: string) => {
    setExpenseToDelete(id)
    setDeleteDialogOpen(true)
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "NEEDS":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Needs</Badge>
      case "PARTIAL_NEEDS":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Partial-Needs</Badge>
      case "AVOID":
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Avoid</Badge>
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    return type === "EXPECTED" ? (
      <Badge variant="outline" className="text-blue-600 dark:text-blue-400">Expected</Badge>
    ) : (
      <Badge variant="destructive">Unexpected</Badge>
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
            Expense Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your daily expenses with category classification
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Expense Summary */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{summary.count} expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{summary.needsTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalExpenses > 0 ? ((summary.needsTotal / summary.totalExpenses) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avoid</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{summary.avoidTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalExpenses > 0 ? ((summary.avoidTotal / summary.totalExpenses) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unexpected</CardTitle>
              <Receipt className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₹{summary.unexpectedTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalExpenses > 0 ? ((summary.unexpectedTotal / summary.totalExpenses) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available vs Actual Comparison */}
      {!isLoading && available && summary && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Budget vs Actual Spending</span>
            </CardTitle>
            <CardDescription>
              Track your spending against allocated budgets by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Total Expenses vs Available */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Available for Expenses</span>
                    {available.hasBudget && (
                      <Badge variant="secondary" className="ml-2 text-xs">Budgeted</Badge>
                    )}
                  </div>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{available.availableForExpenses.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Total Spent</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    ₹{summary.totalExpenses.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      summary.totalExpenses > available.availableForExpenses
                        ? 'bg-red-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min((summary.totalExpenses / available.availableForExpenses) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {available.availableForExpenses > 0
                      ? `${((summary.totalExpenses / available.availableForExpenses) * 100).toFixed(1)}% used`
                      : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    {summary.totalExpenses > available.availableForExpenses && (
                      <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                    )}
                    <span className={`text-sm font-semibold ${
                      summary.totalExpenses > available.availableForExpenses
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {summary.totalExpenses > available.availableForExpenses ? 'Overspent: ' : 'Remaining: '}
                      ₹{Math.abs(available.availableForExpenses - summary.totalExpenses).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown - Only show if budget is set */}
              {available.hasBudget && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Expected Expenses */}
                  {available.expectedBudget! > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Expected Budget</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          ₹{available.expectedBudget!.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Actual Spent</span>
                        <span className="text-sm font-semibold">
                          ₹{summary.expectedTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            summary.expectedTotal > available.expectedBudget!
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min((summary.expectedTotal / available.expectedBudget!) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {((summary.expectedTotal / available.expectedBudget!) * 100).toFixed(1)}% used
                        </span>
                        {summary.expectedTotal > available.expectedBudget! && (
                          <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Unexpected Expenses */}
                  {available.unexpectedBudget! > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Unexpected Budget</span>
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          ₹{available.unexpectedBudget!.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Actual Spent</span>
                        <span className="text-sm font-semibold">
                          ₹{summary.unexpectedTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            summary.unexpectedTotal > available.unexpectedBudget!
                              ? 'bg-red-500'
                              : 'bg-orange-500'
                          }`}
                          style={{
                            width: `${Math.min((summary.unexpectedTotal / available.unexpectedBudget!) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {((summary.unexpectedTotal / available.unexpectedBudget!) * 100).toFixed(1)}% used
                        </span>
                        {summary.unexpectedTotal > available.unexpectedBudget! && (
                          <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Category-wise spending (always show) */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Category-wise Spending</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Needs */}
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">Needs</span>
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">
                        ₹{summary.needsTotal.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.totalExpenses > 0 ? ((summary.needsTotal / summary.totalExpenses) * 100).toFixed(1) : 0}% of total expenses
                    </p>
                  </div>

                  {/* Avoid */}
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">Avoid</span>
                      <span className="text-sm font-bold text-red-700 dark:text-red-400">
                        ₹{summary.avoidTotal.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.totalExpenses > 0 ? ((summary.avoidTotal / summary.totalExpenses) * 100).toFixed(1) : 0}% of total expenses
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Expense List</CardTitle>
              <CardDescription>All expenses for selected month</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="NEEDS">Needs</SelectItem>
                  <SelectItem value="PARTIAL_NEEDS">Partial-Needs</SelectItem>
                  <SelectItem value="AVOID">Avoid</SelectItem>
                  <SelectItem value="EXPECTED">Expected</SelectItem>
                  <SelectItem value="UNEXPECTED">Unexpected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No expenses found for this period</p>
              <Button onClick={() => router.push("/expenses/new")} className="mt-4">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payment Info</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {new Date(expense.date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>{expense.title}</TableCell>
                      <TableCell>{getTypeBadge(expense.expenseType)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getCategoryBadge(expense.category)}
                          {expense.category === "PARTIAL_NEEDS" && expense.needsPortion && expense.avoidPortion && (
                            <div className="text-xs text-muted-foreground">
                              <div>Needs: ₹{expense.needsPortion.toLocaleString()}</div>
                              <div>Avoid: ₹{expense.avoidPortion.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {expense.paymentMethod === "CARD" && expense.creditCard ? (
                            <div>
                              <div className="flex items-center space-x-1 text-sm">
                                <Wallet className="h-3 w-3" />
                                <span className="font-medium">{expense.creditCard.bank}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ••••{expense.creditCard.lastFourDigits}
                              </div>
                              {expense.paymentDueDate && (
                                <div className="text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    Due: {new Date(expense.paymentDueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {expense.paymentMethod}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{Number(expense.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(expense.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}