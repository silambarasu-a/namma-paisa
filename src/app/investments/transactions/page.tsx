"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Receipt, Calendar, Filter, FileText, Pencil, Trash2 } from "lucide-react"
import type { Transaction, TransactionType } from "@/types"
import {
  BUCKET_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_COLORS,
} from "@/constants"

interface TransactionWithHolding extends Omit<Transaction, 'purchaseDate' | 'createdAt' | 'updatedAt'> {
  purchaseDate: string
  createdAt: string
  updatedAt: string
  holding?: {
    id: string
    name: string
    symbol: string
  } | null
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithHolding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [selectedBucket, setSelectedBucket] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithHolding | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionWithHolding | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state for editing
  const [editQty, setEditQty] = useState<number>(0)
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editAmount, setEditAmount] = useState<number>(0)
  const [editAmountInr, setEditAmountInr] = useState<number | null>(null)
  const [editUsdInrRate, setEditUsdInrRate] = useState<number | null>(null)

  useEffect(() => {
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedBucket, selectedType])

  const loadTransactions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
      })

      if (selectedBucket !== "all") {
        params.append("bucket", selectedBucket)
      }

      if (selectedType !== "all") {
        params.append("type", selectedType)
      }

      const response = await fetch(`/api/investments/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      } else {
        toast.error("Failed to load transactions")
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (transaction: TransactionWithHolding) => {
    setEditingTransaction(transaction)
    setEditQty(transaction.qty)
    setEditPrice(transaction.price)
    setEditAmount(transaction.amount)
    setEditAmountInr(transaction.amountInr ?? null)
    setEditUsdInrRate(transaction.usdInrRate ?? null)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (transaction: TransactionWithHolding) => {
    setDeletingTransaction(transaction)
    setIsDeleteDialogOpen(true)
  }

  // Handlers for real-time calculation
  const handleQtyChange = (value: number) => {
    setEditQty(value)
    const newAmount = parseFloat((value * editPrice).toFixed(2))
    setEditAmount(newAmount)
    if (editingTransaction?.currency === "USD" && editUsdInrRate) {
      setEditAmountInr(parseFloat((newAmount * editUsdInrRate).toFixed(2)))
    }
  }

  const handlePriceChange = (value: number) => {
    setEditPrice(value)
    const newAmount = parseFloat((editQty * value).toFixed(2))
    setEditAmount(newAmount)
    if (editingTransaction?.currency === "USD" && editUsdInrRate) {
      setEditAmountInr(parseFloat((newAmount * editUsdInrRate).toFixed(2)))
    }
  }

  const handleAmountChange = (value: number) => {
    setEditAmount(value)
    if (editPrice > 0) {
      setEditQty(parseFloat((value / editPrice).toFixed(6)))
    }
    if (editingTransaction?.currency === "USD" && editUsdInrRate) {
      setEditAmountInr(parseFloat((value * editUsdInrRate).toFixed(2)))
    }
  }

  const handleAmountInrChange = (value: number | null) => {
    setEditAmountInr(value)
    if (value && editUsdInrRate && editUsdInrRate > 0) {
      const newAmount = parseFloat((value / editUsdInrRate).toFixed(2))
      setEditAmount(newAmount)
      if (editPrice > 0) {
        setEditQty(parseFloat((newAmount / editPrice).toFixed(6)))
      }
    }
  }

  const handleUsdInrRateChange = (value: number | null) => {
    setEditUsdInrRate(value)
    if (value && editAmount > 0) {
      setEditAmountInr(parseFloat((editAmount * value).toFixed(2)))
    }
  }

  const confirmDelete = async () => {
    if (!deletingTransaction) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/investments/transactions/${deletingTransaction.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setIsDeleteDialogOpen(false)
        setDeletingTransaction(null)
        loadTransactions()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to delete transaction")
      }
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast.error("An error occurred while deleting")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingTransaction) return

    try {
      setIsSaving(true)
      const formData = new FormData(e.currentTarget)

      const updateData: {
        qty: number
        price: number
        amount: number
        description: string
        purchaseDate: string
        amountInr?: number | null
        usdInrRate?: number | null
      } = {
        qty: editQty,
        price: editPrice,
        amount: editAmount,
        description: formData.get("description") as string,
        purchaseDate: formData.get("purchaseDate") as string,
      }

      // Only include currency fields if currency is USD
      if (editingTransaction.currency === "USD") {
        if (editAmountInr !== null) {
          updateData.amountInr = editAmountInr
        }

        if (editUsdInrRate !== null) {
          updateData.usdInrRate = editUsdInrRate
        }
      }

      const response = await fetch(`/api/investments/transactions/${editingTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        toast.success("Transaction updated successfully")
        setIsEditDialogOpen(false)
        setEditingTransaction(null)
        loadTransactions()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update transaction")
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("An error occurred while updating")
    } finally {
      setIsSaving(false)
    }
  }

  const calculateTotals = () => {
    const totals: Record<TransactionType, number> = {
      ONE_TIME_PURCHASE: 0,
      SIP_EXECUTION: 0,
      MANUAL_ENTRY: 0,
      MANUAL_EDIT: 0,
    }

    transactions.forEach((txn) => {
      // Use amountInr if available (for USD transactions), otherwise use amount (for INR)
      let amountInInr: number
      if (txn.currency === "USD") {
        // For USD transactions, use amountInr if available, otherwise convert using usdInrRate
        if (txn.amountInr) {
          amountInInr = Number(txn.amountInr)
        } else if (txn.usdInrRate) {
          amountInInr = Number(txn.amount) * Number(txn.usdInrRate)
        } else {
          // Fallback: skip this transaction if we can't convert to INR
          amountInInr = 0
        }
      } else {
        // For INR transactions, use amount directly
        amountInInr = Number(txn.amount)
      }
      totals[txn.transactionType] += amountInInr
    })

    return totals
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

  const buckets = [
    { value: "all", label: "All Buckets" },
    { value: "MUTUAL_FUND", label: "Mutual Funds" },
    { value: "IND_STOCK", label: "Indian Stocks" },
    { value: "US_STOCK", label: "US Stocks" },
    { value: "CRYPTO", label: "Cryptocurrency" },
    { value: "EMERGENCY_FUND", label: "Emergency Fund" },
  ]

  const types = [
    { value: "all", label: "All Types" },
    { value: "ONE_TIME_PURCHASE", label: "One-Time Purchase" },
    { value: "SIP_EXECUTION", label: "SIP Execution" },
    { value: "MANUAL_ENTRY", label: "Manual Entry" },
    { value: "MANUAL_EDIT", label: "Manual Edit" },
  ]

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

  const totals = calculateTotals()
  const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Transaction History
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Complete record of all investment transactions and SIP executions
        </p>
      </div>

      {/* Filters */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
        <div className="relative flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Filters</h3>
          </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full">
              <SelectValue />
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
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBucket} onValueChange={setSelectedBucket}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {buckets.map((bucket) => (
                <SelectItem key={bucket.value} value={bucket.value}>
                  {bucket.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>
      </div>

      {/* Summary Cards */}
      {transactions.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-white/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-blue-100/80 dark:bg-blue-900/40 rounded-xl backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                  <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Invested</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{grandTotal.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions.length} transactions
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-green-100/80 dark:bg-green-900/40 rounded-xl backdrop-blur-sm border border-green-200/50 dark:border-green-700/50">
                  <Receipt className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">One-Time</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₹{totals.ONE_TIME_PURCHASE.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Manual purchases
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50/80 via-amber-50/60 to-white/60 dark:from-orange-900/20 dark:via-amber-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-orange-200/50 dark:border-orange-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-orange-100/80 dark:bg-orange-900/40 rounded-xl backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/50">
                  <Receipt className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">SIP Executions</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    ₹{totals.SIP_EXECUTION.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-invested
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50/80 via-slate-50/60 to-white/60 dark:from-gray-900/20 dark:via-slate-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 via-transparent to-slate-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-gray-100/80 dark:bg-gray-900/40 rounded-xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <Receipt className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manual Entries</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    ₹{totals.MANUAL_ENTRY.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Existing holdings
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-50/80 via-amber-50/60 to-white/60 dark:from-yellow-900/20 dark:via-amber-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-yellow-100/80 dark:bg-yellow-900/40 rounded-xl backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-700/50">
                  <Receipt className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Edits</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    ₹{totals.MANUAL_EDIT.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Modifications
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
        <div className="relative">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                  <Receipt className="h-5 w-5" />
                  All Transactions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Detailed transaction history for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </p>
              </div>
              {transactions.length > 0 && (
                <Badge variant="secondary" className="text-sm bg-purple-100/80 dark:bg-purple-900/40 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50">
                  {transactions.length} {transactions.length === 1 ? 'Transaction' : 'Transactions'}
                </Badge>
              )}
            </div>
          </div>
          <div className="px-6 pb-6">
          {transactions.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Bucket</TableHead>
                    <TableHead className="font-semibold">Symbol</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="text-right font-semibold">Quantity</TableHead>
                    <TableHead className="text-right font-semibold">Price</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                    <TableHead className="text-right font-semibold">Amount (INR)</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(txn.purchaseDate).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={TRANSACTION_TYPE_COLORS[txn.transactionType]}>
                          {TRANSACTION_TYPE_LABELS[txn.transactionType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {BUCKET_LABELS[txn.bucket] || txn.bucket}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {txn.symbol}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={txn.name}>
                        {txn.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.qty.toLocaleString(undefined, { maximumFractionDigits: 9 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.currency === "USD" ? "$" : "₹"}{txn.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {txn.currency === "USD" ? "$" : "₹"}{txn.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.amountInr ? `₹${txn.amountInr.toLocaleString()}` : "-"}
                        {txn.usdInrRate && txn.currency === "USD" && (
                          <div className="text-xs text-muted-foreground">
                            @ ₹{txn.usdInrRate.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground" title={txn.description || ""}>
                        {txn.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(txn)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(txn)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">No Transactions Found</h3>
                  <p className="text-muted-foreground text-sm">
                    No transactions for the selected filters. Try changing the month or filters.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update transaction details. Changes will be reflected in holdings.
              </DialogDescription>
            </DialogHeader>
          {editingTransaction && (
            <form onSubmit={handleUpdateTransaction}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="qty">Quantity</Label>
                    <Input
                      id="qty"
                      name="qty"
                      type="number"
                      step="any"
                      value={editQty}
                      onChange={(e) => handleQtyChange(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price ({editingTransaction.currency === "USD" ? "$" : "₹"})</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="any"
                      value={editPrice}
                      onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount">Amount ({editingTransaction.currency === "USD" ? "$" : "₹"})</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="any"
                    value={editAmount}
                    onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated or manually editable
                  </p>
                </div>

                {editingTransaction.currency === "USD" && (
                  <>
                    <div>
                      <Label htmlFor="amountInr">Amount (INR)</Label>
                      <Input
                        id="amountInr"
                        name="amountInr"
                        type="number"
                        step="any"
                        value={editAmountInr || ""}
                        onChange={(e) => handleAmountInrChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Amount in INR"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-calculated or manually editable
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="usdInrRate">USD/INR Rate</Label>
                      <Input
                        id="usdInrRate"
                        name="usdInrRate"
                        type="number"
                        step="any"
                        value={editUsdInrRate || ""}
                        onChange={(e) => handleUsdInrRateChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Exchange rate"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    name="purchaseDate"
                    type="date"
                    defaultValue={new Date(editingTransaction.purchaseDate).toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    type="text"
                    defaultValue={editingTransaction.description || ""}
                    placeholder="Optional description"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm">
                  <p className="text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Fields auto-calculate as you type. Edit any field to recalculate others. Changes will update the holding&apos;s average cost.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
                {deletingTransaction && (
                  <div className="mt-4 p-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md space-y-1 text-sm border border-gray-200/50 dark:border-gray-700/50">
                  <div><strong>Symbol:</strong> {deletingTransaction.symbol}</div>
                  <div><strong>Quantity:</strong> {deletingTransaction.qty.toLocaleString()}</div>
                  <div><strong>Price:</strong> {deletingTransaction.currency === "USD" ? "$" : "₹"}{deletingTransaction.price.toLocaleString()}</div>
                  <div><strong>Amount:</strong> {deletingTransaction.currency === "USD" ? "$" : "₹"}{deletingTransaction.amount.toLocaleString()}</div>
                </div>
              )}
              <p className="mt-4 text-amber-600 dark:text-amber-500 font-medium">
                The holding quantity and average cost will be updated accordingly.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
