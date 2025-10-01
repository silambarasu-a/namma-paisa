"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Receipt, PlusCircle, Wallet, Calendar, TrendingUp, TrendingDown, DollarSign, Trash2, Edit as EditIcon, AlertCircle, CreditCard as CardIcon, Info } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AvailableAmount, Expense, ExpenseSummary, CreditCard } from "@/types"
import { MONTHS } from "@/constants"

export default function ExpensesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [available, setAvailable] = useState<AvailableAmount | null>(null)
  const [isLoadingBudget, setIsLoadingBudget] = useState(true)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>("date")

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null)
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])

  // Form states
  const [date, setDate] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [expenseType, setExpenseType] = useState<"EXPECTED" | "UNEXPECTED">("EXPECTED")
  const [category, setCategory] = useState<"NEEDS" | "PARTIAL_NEEDS" | "AVOID">("NEEDS")
  const [amount, setAmount] = useState("")
  const [needsPortion, setNeedsPortion] = useState("")
  const [avoidPortion, setAvoidPortion] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER">("CASH")
  const [creditCardId, setCreditCardId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadAvailableAmount()
    fetchSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    fetchExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, filter, sortBy])

  const loadAvailableAmount = async () => {
    try {
      setIsLoadingBudget(true)

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
                expectedBudget = Number(budget.expectedAmount)
              }

              if (budget.unexpectedPercent) {
                unexpectedBudget = (availableSurplus * budget.unexpectedPercent) / 100
              } else if (budget.unexpectedAmount) {
                unexpectedBudget = Number(budget.unexpectedAmount)
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
      setIsLoadingBudget(false)
    }
  }

  const fetchSummary = async () => {
    try {
      setIsLoadingSummary(true)
      const params = new URLSearchParams()
      params.append("month", selectedMonth)
      params.append("year", selectedYear)

      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      setIsLoadingExpenses(true)
      const params = new URLSearchParams()
      if (filter !== "all") params.append("filter", filter)
      params.append("sortBy", sortBy)
      params.append("month", selectedMonth)
      params.append("year", selectedYear)

      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses)
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
    } finally {
      setIsLoadingExpenses(false)
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
        fetchSummary()
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

  // Load credit cards when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      const loadCreditCards = async () => {
        try {
          const response = await fetch("/api/credit-cards")
          if (response.ok) {
            const data = await response.json()
            setCreditCards(data.filter((card: CreditCard) => card.isActive))
          }
        } catch (error) {
          console.error("Error loading credit cards:", error)
        }
      }
      loadCreditCards()
    }
  }, [dialogOpen])

  // Auto-calculate total amount for partial-needs
  useEffect(() => {
    if (category === "PARTIAL_NEEDS") {
      const needs = parseFloat(needsPortion) || 0
      const avoid = parseFloat(avoidPortion) || 0
      setAmount((needs + avoid).toString())
    }
  }, [category, needsPortion, avoidPortion])

  // Check if dialog should open from query params
  useEffect(() => {
    if (searchParams?.get("add") === "true") {
      openDialog()
      // Clear the query param
      router.replace("/expenses")
    }
  }, [searchParams, router])

  const openDialog = (expense?: Expense) => {
    if (expense) {
      setIsEditing(true)
      setCurrentExpense(expense)
      setDate(new Date(expense.date).toISOString().split('T')[0])
      setTitle(expense.title)
      setDescription(expense.description || "")
      setExpenseType(expense.expenseType)
      setCategory(expense.category)
      setAmount(expense.amount.toString())
      setNeedsPortion(expense.needsPortion?.toString() || "")
      setAvoidPortion(expense.avoidPortion?.toString() || "")
      setPaymentMethod(expense.paymentMethod)
      setCreditCardId(expense.creditCardId || "")
    } else {
      setIsEditing(false)
      setCurrentExpense(null)
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
      setTitle("")
      setDescription("")
      setExpenseType("EXPECTED")
      setCategory("NEEDS")
      setAmount("")
      setNeedsPortion("")
      setAvoidPortion("")
      setPaymentMethod("CASH")
      setCreditCardId("")
    }
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setIsEditing(false)
    setCurrentExpense(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!date || !title || !amount) {
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      if (parseFloat(amount) <= 0) {
        toast.error("Amount must be greater than 0")
        setIsSubmitting(false)
        return
      }

      if (category === "PARTIAL_NEEDS") {
        const needs = parseFloat(needsPortion) || 0
        const avoid = parseFloat(avoidPortion) || 0

        if (needs <= 0 && avoid <= 0) {
          toast.error("At least one portion must be greater than 0 for partial-needs")
          setIsSubmitting(false)
          return
        }

        if (Math.abs((needs + avoid) - parseFloat(amount)) > 0.01) {
          toast.error("Needs + Avoid portions must equal the total amount")
          setIsSubmitting(false)
          return
        }
      }

      if (paymentMethod === "CARD" && !creditCardId) {
        toast.error("Please select a credit card")
        setIsSubmitting(false)
        return
      }

      const body: any = {
        date,
        title,
        description: description || undefined,
        expenseType,
        category,
        amount: parseFloat(amount),
        paymentMethod,
      }

      if (category === "PARTIAL_NEEDS") {
        body.needsPortion = parseFloat(needsPortion) || 0
        body.avoidPortion = parseFloat(avoidPortion) || 0
      }

      if (paymentMethod === "CARD" && creditCardId) {
        body.creditCardId = creditCardId
      }

      const url = isEditing ? `/api/expenses/${currentExpense?.id}` : "/api/expenses"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(isEditing ? "Expense updated successfully!" : "Expense added successfully!")
        closeDialog()
        fetchSummary()
        fetchExpenses()
      } else {
        const data = await response.json()
        toast.error(data.message || `Failed to ${isEditing ? "update" : "add"} expense`)
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canEdit = (expenseDate: string | Date) => {
    const expense = new Date(expenseDate)
    const now = new Date()
    const expenseMonth = expense.getMonth()
    const expenseYear = expense.getFullYear()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Allow editing for current month and future months
    return (expenseYear > currentYear) || (expenseYear === currentYear && expenseMonth >= currentMonth)
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
              {MONTHS.map((month) => (
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
      {isLoadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary && (
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
      {isLoadingBudget ? (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Budget vs Actual Spending</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ) : available && summary && (
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

              <Button onClick={() => openDialog()} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingExpenses ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="ml-auto h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
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
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{expense.title}</span>
                          {expense.description && (
                            <div className="group relative inline-block">
                              <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded shadow-lg">
                                {expense.description}
                                <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
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
                                <CardIcon className="h-3 w-3" />
                                <span className="font-medium">{expense.creditCard.cardName}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {expense.creditCard.bank} ••••{expense.creditCard.lastFourDigits}
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
                        <div className="flex items-center justify-end gap-2">
                          {canEdit(expense.date) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog(expense)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(expense.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Add/Edit Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>{isEditing ? "Edit Expense" : "Add New Expense"}</span>
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Update expense details" : "Record a new expense with category classification"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 px-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="dialog-date" className="text-sm">Date *</Label>
                <Input
                  id="dialog-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dialog-type" className="text-sm">Type *</Label>
                <Select value={expenseType} onValueChange={(value: "EXPECTED" | "UNEXPECTED") => setExpenseType(value)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPECTED">Expected</SelectItem>
                    <SelectItem value="UNEXPECTED">Unexpected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dialog-category" className="text-sm">Category *</Label>
                <Select value={category} onValueChange={(value: "NEEDS" | "PARTIAL_NEEDS" | "AVOID") => {
                  setCategory(value)
                  if (value !== "PARTIAL_NEEDS") {
                    setNeedsPortion("")
                    setAvoidPortion("")
                  }
                }}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEEDS">Needs</SelectItem>
                    <SelectItem value="PARTIAL_NEEDS">Partial-Needs</SelectItem>
                    <SelectItem value="AVOID">Avoid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog-title" className="text-sm">Title *</Label>
              <Input
                id="dialog-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grocery shopping"
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog-description" className="text-sm">Description</Label>
              <Textarea
                id="dialog-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes or details about this expense"
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>

            {category === "PARTIAL_NEEDS" ? (
              <div className="space-y-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Split expense: needs vs avoidable spending
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dialog-needs" className="text-sm">Needs (₹) *</Label>
                    <Input
                      id="dialog-needs"
                      type="number"
                      step="0.01"
                      min="0"
                      value={needsPortion}
                      onChange={(e) => setNeedsPortion(e.target.value)}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dialog-avoid" className="text-sm">Avoid (₹) *</Label>
                    <Input
                      id="dialog-avoid"
                      type="number"
                      step="0.01"
                      min="0"
                      value={avoidPortion}
                      onChange={(e) => setAvoidPortion(e.target.value)}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dialog-amount" className="text-sm">Total (₹)</Label>
                    <Input
                      id="dialog-amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 h-9"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="dialog-amount" className="text-sm">Amount (₹) *</Label>
                <Input
                  id="dialog-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="h-9"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="dialog-payment" className="text-sm">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(value: "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER") => {
                  setPaymentMethod(value)
                  if (value !== "CARD") setCreditCardId("")
                }}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-4 w-4" />
                        <span>Cash</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CARD">
                      <div className="flex items-center space-x-2">
                        <CardIcon className="h-4 w-4" />
                        <span>Credit/Debit Card</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "CARD" && (
                <div className="space-y-1.5">
                  <Label htmlFor="dialog-card" className="text-sm">Select Card *</Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select credit card" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.length === 0 ? (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                          No active cards found
                        </div>
                      ) : (
                        creditCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.bank} - {card.cardName} (••••{card.lastFourDigits})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add"} Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}