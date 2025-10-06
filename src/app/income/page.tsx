"use client"

import { useState, useEffect } from "react"
import { formatDate } from "@/lib/utils"
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
import type { Income, Salary } from "@/types"
import { INCOME_CATEGORIES } from "@/constants"

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
  const [deleteIncomeDialogOpen, setDeleteIncomeDialogOpen] = useState(false)
  const [deleteSalaryDialogOpen, setDeleteSalaryDialogOpen] = useState(false)
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null)
  const [salaryToDelete, setSalaryToDelete] = useState<string | null>(null)

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

  // Track active tab
  const [activeTab, setActiveTab] = useState("additional")

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch {
      toast.error("An error occurred")
    }
  }

  const handleDelete = async () => {
    if (!incomeToDelete) return

    try {
      const response = await fetch(`/api/income/${incomeToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Income deleted successfully")
        loadData()
      } else {
        toast.error("Failed to delete income")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setDeleteIncomeDialogOpen(false)
      setIncomeToDelete(null)
    }
  }

  const openDeleteIncomeDialog = (id: string) => {
    setIncomeToDelete(id)
    setDeleteIncomeDialogOpen(true)
  }

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const body = {
        monthly: parseFloat(salaryAmount),
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
    } catch {
      toast.error("An error occurred")
    }
  }

  const handleDeleteSalary = async () => {
    if (!salaryToDelete) return

    try {
      const response = await fetch(`/api/profile/salary`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: salaryToDelete }),
      })

      if (response.ok) {
        toast.success("Salary entry deleted successfully")
        loadData()
      } else {
        toast.error("Failed to delete salary entry")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setDeleteSalaryDialogOpen(false)
      setSalaryToDelete(null)
    }
  }

  const openDeleteSalaryDialog = (id: string) => {
    setSalaryToDelete(id)
    setDeleteSalaryDialogOpen(true)
  }

  const monthlyTotal = (salary?.monthly || 0) + totalIncome

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your monthly salary and additional income
        </p>
      </div>

      <Tabs defaultValue="additional" className="space-y-6" onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="additional" className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Additional Income</span>
              <span className="sm:hidden">Additional</span>
            </TabsTrigger>
            <TabsTrigger value="salary" className="flex items-center justify-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Monthly Salary</span>
              <span className="sm:hidden">Salary</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "additional" && (
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Income
            </Button>
          )}
          {activeTab === "salary" && (
            <Button onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setSalaryEffectiveFrom(today)
              setIsSalaryDialogOpen(true)
            }} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              Update Salary
            </Button>
          )}
        </div>

        <TabsContent value="additional" className="space-y-6">

      {/* Filter */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        <div className="relative p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Filter by Period</span>
            </h3>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100/80 dark:bg-green-900/40 rounded-xl backdrop-blur-sm border border-green-200/50 dark:border-green-700/50">
                <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Salary</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">Current base salary</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{(salary?.monthly || 0).toLocaleString()}
            </div>
            {salary?.effectiveFrom && (
              <p className="text-xs text-muted-foreground mt-1">
                Effective from {formatDate(salary.effectiveFrom)}
              </p>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-cyan-50/60 to-white/60 dark:from-blue-900/20 dark:via-cyan-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100/80 dark:bg-blue-900/40 rounded-xl backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Additional Income</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">This month</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incomes.length} {incomes.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50/80 via-violet-50/60 to-white/60 dark:from-purple-900/20 dark:via-violet-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 pointer-events-none"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100/80 dark:bg-purple-900/40 rounded-xl backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">Salary + Additional</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ₹{monthlyTotal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Income List */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none"></div>
        <div className="relative p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Additional Income Records</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Custom income entries for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
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
                  className="flex flex-col gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
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
                      {formatDate(income.date)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        +₹{income.amount.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
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
                        onClick={() => openDeleteIncomeDialog(income.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        </TabsContent>

        <TabsContent value="salary" className="space-y-6">

          {/* Current Salary Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100/80 dark:bg-green-900/40 rounded-xl backdrop-blur-sm border border-green-200/50 dark:border-green-700/50">
                  <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Current Monthly Salary</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {salary ? `Effective from ${new Date(salary.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No salary record found'}
                  </p>
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                ₹{salary ? Number(salary.monthly).toLocaleString() : '0'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Monthly take-home
              </p>
            </div>
          </div>

          {/* Salary History */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            <div className="relative p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <History className="h-5 w-5" />
                  <span>Salary History</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your salary changes over time
                </p>
              </div>
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
                      className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold">₹{Number(salaryItem.monthly).toLocaleString()}</h4>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From {formatDate(salaryItem.effectiveFrom)}
                          {salaryItem.effectiveTo && (
                            <> to {formatDate(salaryItem.effectiveTo)}</>
                          )}
                          {!salaryItem.effectiveTo && index === 0 && <> (Active)</>}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteSalaryDialog(salaryItem.id)}
                        className="self-end text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 sm:self-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Income Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Salary Dialog */}
      <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
          <DialogHeader>
            <DialogTitle>Update Monthly Salary</DialogTitle>
            <DialogDescription>
              Add a new salary record with the effective date
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalarySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salaryAmount">Monthly Salary (₹) *</Label>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Income Confirmation Dialog */}
      <AlertDialog open={deleteIncomeDialogOpen} onOpenChange={setDeleteIncomeDialogOpen}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this income entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Salary Confirmation Dialog */}
      <AlertDialog open={deleteSalaryDialogOpen} onOpenChange={setDeleteSalaryDialogOpen}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this salary entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSalary} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}