"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Wallet, DollarSign, Percent, AlertCircle, Save, ArrowRight } from "lucide-react"

interface BudgetData {
  expectedPercent?: number
  expectedAmount?: number
  unexpectedPercent?: number
  unexpectedAmount?: number
}

interface AvailableAmount {
  salary: number
  taxAmount: number
  totalLoans: number
  totalInvestments: number
  totalSIPs: number
  availableForExpenses: number
}

export default function ExpenseBudgetPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [budget, setBudget] = useState<BudgetData>({})
  const [available, setAvailable] = useState<AvailableAmount | null>(null)

  // Mode selection
  const [expectedMode, setExpectedMode] = useState<"percent" | "amount">("percent")
  const [unexpectedMode, setUnexpectedMode] = useState<"percent" | "amount">("percent")

  // Form values
  const [expectedPercent, setExpectedPercent] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [unexpectedPercent, setUnexpectedPercent] = useState("")
  const [unexpectedAmount, setUnexpectedAmount] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch current budget
      const budgetRes = await fetch("/api/expenses/budget")
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json()
        setBudget(budgetData)

        // Set form values and modes
        if (budgetData.expectedPercent) {
          setExpectedMode("percent")
          setExpectedPercent(budgetData.expectedPercent.toString())
        } else if (budgetData.expectedAmount) {
          setExpectedMode("amount")
          setExpectedAmount(budgetData.expectedAmount.toString())
        }

        if (budgetData.unexpectedPercent) {
          setUnexpectedMode("percent")
          setUnexpectedPercent(budgetData.unexpectedPercent.toString())
        } else if (budgetData.unexpectedAmount) {
          setUnexpectedMode("amount")
          setUnexpectedAmount(budgetData.unexpectedAmount.toString())
        }
      }

      // Calculate available amount
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

          // Available for expenses = netSalary - tax - loans - (SIPs + investments)
          const availableForExpenses = monthlySalary - calcData.taxAmount - calcData.totalLoanEMI - calcData.totalSIPAmount

          setAvailable({
            salary: monthlySalary,
            taxAmount: calcData.taxAmount,
            totalLoans: calcData.totalLoanEMI,
            totalInvestments: 0, // Not using investment allocations for deduction
            totalSIPs: calcData.totalSIPAmount,
            availableForExpenses,
          })
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load budget data")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateBudgetAmount = (mode: "percent" | "amount", percent: string, amount: string) => {
    if (!available) return 0

    if (mode === "percent") {
      const p = parseFloat(percent) || 0
      return (available.availableForExpenses * p) / 100
    } else {
      return parseFloat(amount) || 0
    }
  }

  const expectedBudgetAmount = calculateBudgetAmount(expectedMode, expectedPercent, expectedAmount)
  const unexpectedBudgetAmount = calculateBudgetAmount(unexpectedMode, unexpectedPercent, unexpectedAmount)
  const totalBudget = expectedBudgetAmount + unexpectedBudgetAmount

  const handleSave = async () => {
    if (!available) {
      toast.error("Unable to save: available amount not calculated")
      return
    }

    if (totalBudget > available.availableForExpenses) {
      toast.error("Total budget cannot exceed available amount")
      return
    }

    setIsSaving(true)
    try {
      const payload: BudgetData = {}

      if (expectedMode === "percent" && expectedPercent) {
        payload.expectedPercent = parseFloat(expectedPercent)
      } else if (expectedMode === "amount" && expectedAmount) {
        payload.expectedAmount = parseFloat(expectedAmount)
      }

      if (unexpectedMode === "percent" && unexpectedPercent) {
        payload.unexpectedPercent = parseFloat(unexpectedPercent)
      } else if (unexpectedMode === "amount" && unexpectedAmount) {
        payload.unexpectedAmount = parseFloat(unexpectedAmount)
      }

      const response = await fetch("/api/expenses/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success("Expense budget saved successfully!")
        router.push("/expenses")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to save budget")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSaving(false)
    }
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

  if (!available) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Expense Budget Allocation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your expense budget allocation
          </p>
        </div>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">
              Setup Required
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Please set your monthly salary in the Income section before configuring expense budget.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Expense Budget Allocation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Allocate your available budget between Expected and Unexpected expenses
        </p>
      </div>

      {/* Available Amount Breakdown */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Available for Expenses</span>
          </CardTitle>
          <CardDescription>
            Amount available after tax, loans, and investments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                ₹{available.availableForExpenses.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">/month</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Income</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  ₹{available.salary.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tax</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  -₹{available.taxAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loans</p>
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  -₹{available.totalLoans.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">SIPs</p>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  -₹{available.totalSIPs.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Allocation */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expected Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Expenses</CardTitle>
            <CardDescription>
              Regular, planned expenses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Allocation Mode</Label>
              <RadioGroup value={expectedMode} onValueChange={(value: "percent" | "amount") => setExpectedMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percent" id="expected-percent" />
                  <Label htmlFor="expected-percent" className="cursor-pointer">Percentage</Label>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="amount" id="expected-amount" />
                  <Label htmlFor="expected-amount" className="cursor-pointer">Fixed Amount</Label>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </RadioGroup>
            </div>

            {expectedMode === "percent" ? (
              <div className="space-y-2">
                <Label htmlFor="expectedPercent">Percentage (%)</Label>
                <Input
                  id="expectedPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={expectedPercent}
                  onChange={(e) => setExpectedPercent(e.target.value)}
                  placeholder="70"
                />
                <p className="text-sm text-muted-foreground">
                  {expectedPercent ? `₹${expectedBudgetAmount.toLocaleString()}` : "Enter percentage"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="expectedAmount">Amount (₹)</Label>
                <Input
                  id="expectedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  placeholder="30000"
                />
              </div>
            )}

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Expected Budget</span>
                <Badge variant="secondary" className="text-green-700 dark:text-green-300">
                  ₹{expectedBudgetAmount.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unexpected Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Unexpected Expenses</CardTitle>
            <CardDescription>
              Emergency or unplanned expenses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Allocation Mode</Label>
              <RadioGroup value={unexpectedMode} onValueChange={(value: "percent" | "amount") => setUnexpectedMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percent" id="unexpected-percent" />
                  <Label htmlFor="unexpected-percent" className="cursor-pointer">Percentage</Label>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="amount" id="unexpected-amount" />
                  <Label htmlFor="unexpected-amount" className="cursor-pointer">Fixed Amount</Label>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </RadioGroup>
            </div>

            {unexpectedMode === "percent" ? (
              <div className="space-y-2">
                <Label htmlFor="unexpectedPercent">Percentage (%)</Label>
                <Input
                  id="unexpectedPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={unexpectedPercent}
                  onChange={(e) => setUnexpectedPercent(e.target.value)}
                  placeholder="30"
                />
                <p className="text-sm text-muted-foreground">
                  {unexpectedPercent ? `₹${unexpectedBudgetAmount.toLocaleString()}` : "Enter percentage"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="unexpectedAmount">Amount (₹)</Label>
                <Input
                  id="unexpectedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unexpectedAmount}
                  onChange={(e) => setUnexpectedAmount(e.target.value)}
                  placeholder="10000"
                />
              </div>
            )}

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Unexpected Budget</span>
                <Badge variant="secondary" className="text-yellow-700 dark:text-yellow-300">
                  ₹{unexpectedBudgetAmount.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <span className="font-medium">Available for Expenses</span>
              <span className="text-lg font-bold">₹{available.availableForExpenses.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-center py-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="font-medium">Expected Budget</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ₹{expectedBudgetAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="font-medium">Unexpected Budget</span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                ₹{unexpectedBudgetAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-center py-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
            </div>

            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
              <span className="font-bold">Total Budget</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                ₹{totalBudget.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <span className="font-medium">Remaining Unallocated</span>
              <span className={`text-lg font-bold ${(available.availableForExpenses - totalBudget) < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                ₹{(available.availableForExpenses - totalBudget).toLocaleString()}
              </span>
            </div>

            {totalBudget > available.availableForExpenses && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Total budget exceeds available amount. Please adjust your allocations.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex space-x-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || totalBudget > available.availableForExpenses}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Budget Allocation"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/expenses")}>
          Cancel
        </Button>
      </div>
    </div>
  )
}