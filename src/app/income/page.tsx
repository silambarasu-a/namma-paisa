"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { DollarSign, Plus, Edit, Trash2, TrendingUp, Calendar as CalendarIcon, Repeat, Briefcase, History } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Income {
  id: string
  date: string
  title: string
  description?: string
  amount: number
  category: string
  isRecurring: boolean
  createdAt: string
}

interface Salary {
  id: string
  netMonthly: number
  effectiveFrom: string
  effectiveTo?: string
}

interface SalaryHistory {
  salaries: Salary[]
  currentSalary: Salary | null
}

const INCOME_CATEGORIES = [
  { value: "FREELANCE", label: "Freelance" },
  { value: "BONUS", label: "Bonus" },
  { value: "GIFT", label: "Gift" },
  { value: "INVESTMENT_RETURN", label: "Investment Return" },
  { value: "REFUND", label: "Refund" },
  { value: "RENTAL", label: "Rental Income" },
  { value: "BUSINESS", label: "Business Income" },
  { value: "OTHER", label: "Other" },
]

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [salary, setSalary] = useState<Salary | null>(null)
  const [salaryHistory, setSalaryHistory] = useState<Salary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentIncome, setCurrentIncome] = useState<Income | null>(null)
  const [totalIncome, setTotalIncome] = useState(0)
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false)

  // Form state
  const [date, setDate] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("OTHER")
  const [isRecurring, setIsRecurring] = useState(false)

  // Salary form state
  const [salaryAmount, setSalaryAmount] = useState("")
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState("")

  // Filter state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    loadData()
  }, [selectedYear, selectedMonth])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load salary
      const salaryRes = await fetch("/api/profile/salary-history")
      if (salaryRes.ok) {
        const salaryData = await salaryRes.json()
        setSalaryHistory(salaryData)
        if (salaryData && salaryData.length > 0) {
          setSalary(salaryData[0])
        }
      }

      // Load custom income
      const incomeRes = await fetch(`/api/income?year=${selectedYear}&month=${selectedMonth}`)
      if (incomeRes.ok) {
        const data = await incomeRes.json()
        setIncomes(data.incomes)
        setTotalIncome(data.total)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load income data")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    setTitle("")
    setDescription("")
    setAmount("")
    setCategory("OTHER")
    setIsRecurring(false)
    setCurrentIncome(null)
    setIsEditing(false)
  }

  const handleOpenDialog = (income?: Income) => {
    if (income) {
      setDate(new Date(income.date).toISOString().split('T')[0])
      setTitle(income.title)
      setDescription(income.description || "")
      setAmount(income.amount.toString())
      setCategory(income.category)
      setIsRecurring(income.isRecurring)
      setCurrentIncome(income)
      setIsEditing(true)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const body = {
        date,
        title,
        description: description || undefined,
        amount: parseFloat(amount),
        category,
        isRecurring,
      }

      const url = isEditing ? `/api/income/${currentIncome?.id}` : "/api/income"
      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(isEditing ? "Income updated successfully" : "Income added successfully")
        setIsDialogOpen(false)
        resetForm()
        loadData()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to save income")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this income?")) return

    try {
      const response = await fetch(`/api/income/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Income deleted successfully")
        loadData()
      } else {
        toast.error("Failed to delete income")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const body = {
        netMonthly: parseFloat(salaryAmount),
        effectiveFrom: salaryEffectiveFrom,
      }

      const response = await fetch("/api/profile/salary-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success("Salary updated successfully")
        setIsSalaryDialogOpen(false)
        setSalaryAmount("")
        setSalaryEffectiveFrom("")
        loadData()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to update salary")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const monthlyTotal = (salary?.netMonthly || 0) + totalIncome

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your monthly salary and additional income
        </p>
      </div>

      <Tabs defaultValue="additional" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="additional" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Additional Income</span>
          </TabsTrigger>
          <TabsTrigger value="salary" className="flex items-center space-x-2">
            <Briefcase className="h-4 w-4" />
            <span>Monthly Salary</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="additional" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Income
            </Button>
          </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Filter by Period</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Salary</CardTitle>
            <CardDescription>From profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{(salary?.netMonthly || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/profile" className="underline hover:text-primary">
                Update salary
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Additional Income</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incomes.length} {incomes.length === 1 ? 'entry' : 'entries'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <CardDescription>Salary + Additional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ₹{monthlyTotal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income List */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Income Records</CardTitle>
          <CardDescription>
            Custom income entries for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No additional income</h3>
              <p className="text-muted-foreground mb-4">
                Add freelance work, bonuses, or other income sources
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {incomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold">{income.title}</h4>
                      {income.isRecurring && (
                        <Badge variant="outline" className="text-xs">
                          <Repeat className="h-3 w-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {INCOME_CATEGORIES.find(c => c.value === income.category)?.label || income.category}
                      </Badge>
                    </div>
                    {income.description && (
                      <p className="text-sm text-muted-foreground mb-1">{income.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(income.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        +₹{income.amount.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(income)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(income.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="salary" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setSalaryEffectiveFrom(today)
              setIsSalaryDialogOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Update Salary
            </Button>
          </div>

          {/* Current Salary Card */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle>Current Monthly Salary</CardTitle>
              <CardDescription>
                {salary ? `Effective from ${new Date(salary.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No salary record found'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                ₹{salary ? Number(salary.netMonthly).toLocaleString() : '0'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Net monthly take-home
              </p>
            </CardContent>
          </Card>

          {/* Salary History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Salary History</span>
              </CardTitle>
              <CardDescription>
                Track your salary changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : salaryHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No salary records</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first salary record to get started
                  </p>
                  <Button onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    setSalaryEffectiveFrom(today)
                    setIsSalaryDialogOpen(true)
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Salary
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {salaryHistory.map((salaryItem, index) => (
                    <div
                      key={salaryItem.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">₹{Number(salaryItem.netMonthly).toLocaleString()}</h4>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From {new Date(salaryItem.effectiveFrom).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          {salaryItem.effectiveTo && (
                            <> to {new Date(salaryItem.effectiveTo).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}</>
                          )}
                          {!salaryItem.effectiveTo && index === 0 && <> (Active)</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Income Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Add"} Income</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update" : "Record"} additional income source
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Freelance Project, Year-end Bonus"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details about this income"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isRecurring" className="cursor-pointer">
                This is recurring income
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{isEditing ? "Update" : "Add"} Income</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Salary Dialog */}
      <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Monthly Salary</DialogTitle>
            <DialogDescription>
              Add a new salary record with the effective date
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalarySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salaryAmount">Net Monthly Salary (₹) *</Label>
              <Input
                id="salaryAmount"
                type="number"
                step="0.01"
                min="0"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your take-home salary after all deductions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salaryEffectiveFrom">Effective From *</Label>
              <Input
                id="salaryEffectiveFrom"
                type="date"
                value={salaryEffectiveFrom}
                onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Date from which this salary is effective
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSalaryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Salary</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}