"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Receipt, Filter, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

interface Expense {
  id: string
  date: string
  title: string
  expenseType: "EXPECTED" | "UNEXPECTED"
  category: "NEEDS" | "PARTIAL_NEEDS" | "AVOID"
  amount: number
  needsPortion?: number
  avoidPortion?: number
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

export default function ExpensesOverview() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")

  useEffect(() => {
    fetchExpenses()
  }, [filter, sortBy])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filter !== "all") params.append("filter", filter)
      params.append("sortBy", sortBy)

      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "NEEDS":
        return <Badge variant="default" className="bg-green-100 text-green-800">Needs</Badge>
      case "PARTIAL_NEEDS":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial-Needs</Badge>
      case "AVOID":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Avoid</Badge>
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    return type === "EXPECTED" ? (
      <Badge variant="outline" className="text-blue-600">Expected</Badge>
    ) : (
      <Badge variant="destructive">Unexpected</Badge>
    )
  }

  const formatPartialExpense = (expense: Expense) => {
    if (expense.category === "PARTIAL_NEEDS" && expense.needsPortion && expense.avoidPortion) {
      return (
        <div className="text-sm">
          <div>Needs: ₹{expense.needsPortion.toLocaleString()}</div>
          <div>Avoid: ₹{expense.avoidPortion.toLocaleString()}</div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Expenses Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your expenses by category
          </p>
        </div>
        <Button asChild>
          <Link href="/expenses/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.count} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.needsTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalExpenses > 0 ?
                  `${((summary.needsTotal / summary.totalExpenses) * 100).toFixed(1)}% of total` :
                  "0% of total"
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avoid</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.avoidTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalExpenses > 0 ?
                  `${((summary.avoidTotal / summary.totalExpenses) * 100).toFixed(1)}% of total` :
                  "0% of total"
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unexpected</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.unexpectedTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalExpenses > 0 ?
                  `${((summary.unexpectedTotal / summary.totalExpenses) * 100).toFixed(1)}% of total` :
                  "0% of total"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Sorting</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Category</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="NEEDS">Needs</SelectItem>
                  <SelectItem value="PARTIAL_NEEDS">Partial-Needs</SelectItem>
                  <SelectItem value="AVOID">Avoid</SelectItem>
                  <SelectItem value="EXPECTED">Expected</SelectItem>
                  <SelectItem value="UNEXPECTED">Unexpected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Latest)</SelectItem>
                  <SelectItem value="amount">Amount (High to Low)</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>
            Your expense history with detailed breakdowns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start tracking your expenses to see insights here.
              </p>
              <Button asChild>
                <Link href="/expenses/new">Add Your First Expense</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Breakdown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {new Date(expense.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.title}
                      </TableCell>
                      <TableCell>
                        {getCategoryBadge(expense.category)}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(expense.expenseType)}
                      </TableCell>
                      <TableCell className="font-bold">
                        ₹{expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {formatPartialExpense(expense) || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}