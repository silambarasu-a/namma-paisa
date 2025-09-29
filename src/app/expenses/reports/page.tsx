"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { BarChart, PieChart, TrendingUp, Calendar } from "lucide-react"

type Period = "daily" | "weekly" | "monthly" | "yearly"

interface ExpenseSummary {
  totalExpenses: number
  totalAmount: number
  expectedCount: number
  expectedAmount: number
  unexpectedCount: number
  unexpectedAmount: number
  needsAmount: number
  partialNeedsAmount: number
  avoidAmount: number
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
  const [period, setPeriod] = useState<Period>("monthly")
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/expenses?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])

        // Calculate summary from expenses
        const summary: ExpenseSummary = {
          totalExpenses: data.expenses?.length || 0,
          totalAmount: 0,
          expectedCount: 0,
          expectedAmount: 0,
          unexpectedCount: 0,
          unexpectedAmount: 0,
          needsAmount: 0,
          partialNeedsAmount: 0,
          avoidAmount: 0,
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

          if (expense.category === "NEEDS") {
            summary.needsAmount += amount
            summary.totalNeedsAmount += amount
          } else if (expense.category === "PARTIAL_NEEDS") {
            const needs = Number(expense.needsPortion || 0)
            const avoid = Number(expense.avoidPortion || 0)
            summary.partialNeedsAmount += amount
            summary.totalNeedsAmount += needs
            summary.totalAvoidAmount += avoid
          } else {
            summary.avoidAmount += amount
            summary.totalAvoidAmount += amount
          }
        })

        setSummary(summary)
      } else {
        toast.error("Failed to load expense data")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getPeriodLabel = () => {
    const labels = {
      daily: "Today",
      weekly: "This Week",
      monthly: "This Month",
      yearly: "This Year",
    }
    return labels[period]
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Expense Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze your spending patterns across different time periods
          </p>
        </div>

        <div className="w-[200px]">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalExpenses}</div>
                <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Amount</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ₹{summary.totalAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Expected Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ₹{summary.expectedAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.expectedCount} expenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unexpected Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ₹{summary.unexpectedAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.unexpectedCount} expenses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Category Breakdown</span>
                </CardTitle>
                <CardDescription>Expenses by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Needs</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      ₹{summary.needsAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${summary.totalAmount > 0 ? (summary.needsAmount / summary.totalAmount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Partial-Needs</span>
                    <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                      ₹{summary.partialNeedsAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{
                        width: `${summary.totalAmount > 0 ? (summary.partialNeedsAmount / summary.totalAmount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Avoid</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      ₹{summary.avoidAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${summary.totalAmount > 0 ? (summary.avoidAmount / summary.totalAmount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5" />
                  <span>Needs vs Avoid Analysis</span>
                </CardTitle>
                <CardDescription>Total breakdown including partial-needs split</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Needs (including partial)</span>
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
                      : 0}% of total
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Avoid (including partial)</span>
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
                      : 0}% of total
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense List */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
              <CardDescription>All expenses for {getPeriodLabel()}</CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="rounded-md border">
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}