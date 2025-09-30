"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Receipt, PlusCircle, BarChart3, List, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AvailableAmount {
  netSalary: number
  taxAmount: number
  totalLoans: number
  totalSIPs: number
  availableForExpenses: number
}

export default function ExpensesPage() {
  const router = useRouter()
  const [available, setAvailable] = useState<AvailableAmount | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAvailableAmount()
  }, [])

  const loadAvailableAmount = async () => {
    try {
      setIsLoading(true)

      // Get salary
      const salaryRes = await fetch("/api/profile/salary-history")
      let netSalary = 0
      if (salaryRes.ok) {
        const salaryHistory = await salaryRes.json()
        if (salaryHistory && salaryHistory.length > 0) {
          netSalary = Number(salaryHistory[0].netMonthly)
        }
      }

      if (netSalary > 0) {
        const calcRes = await fetch("/api/investments/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ netMonthly: netSalary }),
        })

        if (calcRes.ok) {
          const calcData = await calcRes.json()
          const availableForExpenses = netSalary - calcData.taxAmount - calcData.totalLoanEMI - calcData.totalSIPAmount

          setAvailable({
            netSalary,
            taxAmount: calcData.taxAmount,
            totalLoans: calcData.totalLoanEMI,
            totalSIPs: calcData.totalSIPAmount,
            availableForExpenses,
          })
        }
      }
    } catch (error) {
      console.error("Error loading available amount:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Expense Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track and manage your daily expenses with category classification
        </p>
      </div>

      {/* Available Amount Card */}
      {!isLoading && available && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Available for Expenses</span>
            </CardTitle>
            <CardDescription>
              Amount available after tax, loans, and SIPs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                ₹{available.availableForExpenses.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                Salary: ₹{available.netSalary.toLocaleString()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Tax: -₹{available.taxAmount.toLocaleString()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Loans: -₹{available.totalLoans.toLocaleString()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                SIPs: -₹{available.totalSIPs.toLocaleString()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/expenses/budget")}>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle>Budget Allocation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Configure your expense budget (Expected vs Unexpected) with percentage or fixed amount
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/expenses/new")}>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <PlusCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Add Expense</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Record a new expense with category classification (Needs, Partial-Needs, Avoid)
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/expenses/overview")}>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <List className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Expense Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              View all your expenses with filtering and search capabilities
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/expenses/reports")}>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Reports</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              View period reports (daily, weekly, monthly, yearly) with charts and insights
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About Expense Categories</CardTitle>
          <CardDescription>Understanding how to classify your expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                <Receipt className="inline h-4 w-4 mr-2" />
                Needs
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Essential expenses required for daily living - groceries, rent, utilities, healthcare, transportation to work, etc.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                <Receipt className="inline h-4 w-4 mr-2" />
                Partial-Needs
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Mixed expenses with both essential and non-essential components. For example, a grocery trip where you bought necessities plus luxury items. You'll split this into two portions.
              </p>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                <Receipt className="inline h-4 w-4 mr-2" />
                Avoid
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                Non-essential expenses that could be avoided - entertainment, dining out, luxury purchases, subscriptions you don't need, etc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button onClick={() => router.push("/expenses/budget")} variant="outline">
              <Receipt className="h-4 w-4 mr-2" />
              Budget Allocation
            </Button>
            <Button onClick={() => router.push("/expenses/new")} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Expense
            </Button>
            <Button onClick={() => router.push("/expenses/overview")} variant="outline">
              <List className="h-4 w-4 mr-2" />
              View All Expenses
            </Button>
            <Button onClick={() => router.push("/expenses/reports")} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}