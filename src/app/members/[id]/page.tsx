"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  FileText,
} from "lucide-react"
import { format } from "date-fns"

type MemberCategory = "FAMILY" | "FRIEND" | "RELATIVE" | "OTHER"
type TransactionType = "GAVE" | "OWE" | "EXPENSE_PAID_FOR_THEM" | "EXPENSE_PAID_BY_THEM"
type PaymentMethod = "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER"

interface Member {
  id: string
  name: string
  category: MemberCategory
  phoneNumber: string | null
  email: string | null
  notes: string | null
  currentBalance: number
  extraSpent: number
  extraOwe: number
  createdAt: string
}

interface MemberTransaction {
  id: string
  transactionType: TransactionType
  amount: number
  date: string
  description: string | null
  paymentMethod: PaymentMethod | null
  isSettled: boolean
  settledDate: string | null
  settledAmount: number | null
  settledNotes: string | null
  settlementIncomeId: string | null
  settlementExpenseId: string | null
  createdAt: string
  expense: {
    id: string
    title: string
    date: string
  } | null
}

interface MemberDetail extends Member {
  transactions: MemberTransaction[]
}

const categoryColors: Record<MemberCategory, string> = {
  FAMILY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  FRIEND: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  RELATIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
}

const transactionTypeLabels: Record<TransactionType, string> = {
  GAVE: "You gave",
  OWE: "You borrowed",
  EXPENSE_PAID_FOR_THEM: "Expense paid for them",
  EXPENSE_PAID_BY_THEM: "Expense paid by them",
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  NET_BANKING: "Net Banking",
  OTHER: "Other",
}

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const memberId = params.id as string

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add transaction form
  const [transactionType, setTransactionType] = useState<TransactionType>("GAVE")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")

  // Settle transaction
  const [transactionToSettle, setTransactionToSettle] = useState<MemberTransaction | null>(null)
  const [settledNotes, setSettledNotes] = useState("")
  const [settledAmount, setSettledAmount] = useState("")
  const [useCustomAmount, setUseCustomAmount] = useState(false)

  useEffect(() => {
    fetchMemberDetails()
  }, [memberId])

  const fetchMemberDetails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/members/${memberId}`)
      if (!response.ok) throw new Error("Failed to fetch member details")

      const data = await response.json()
      setMember(data)
    } catch (error) {
      console.error("Error fetching member details:", error)
      toast.error("Failed to load member details")
      router.push("/members")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTransaction = () => {
    setDialogOpen(true)
  }

  const resetForm = () => {
    setTransactionType("GAVE")
    setAmount("")
    setDate(new Date().toISOString().split("T")[0])
    setDescription("")
    setPaymentMethod("CASH")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        memberId,
        transactionType,
        amount: parseFloat(amount),
        date,
        description: description || undefined,
        paymentMethod,
      }

      const response = await fetch("/api/member-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to add transaction")
      }

      toast.success("Transaction added successfully")
      setDialogOpen(false)
      resetForm()
      fetchMemberDetails()
    } catch (error) {
      console.error("Error adding transaction:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSettleClick = (transaction: MemberTransaction) => {
    setTransactionToSettle(transaction)
    setSettledNotes("")
    setSettledAmount(transaction.amount.toString())
    setUseCustomAmount(false)
    setSettleDialogOpen(true)
  }

  const handleSettleTransaction = async () => {
    if (!transactionToSettle) return

    // Validate custom amount if used
    if (useCustomAmount) {
      const amount = parseFloat(settledAmount)
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid settlement amount")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const body: { settledNotes?: string; settledAmount?: number } = {}

      if (settledNotes.trim()) {
        body.settledNotes = settledNotes
      }

      if (useCustomAmount && settledAmount) {
        body.settledAmount = parseFloat(settledAmount)
      }

      const response = await fetch(`/api/member-transactions/${transactionToSettle.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to settle transaction")
      }

      toast.success("Transaction settled successfully")
      setSettleDialogOpen(false)
      setTransactionToSettle(null)
      fetchMemberDetails()
    } catch (error) {
      console.error("Error settling transaction:", error)
      toast.error(error instanceof Error ? error.message : "Failed to settle transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnsettleTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to unsettle this transaction? This will reverse the settlement and delete any linked income/expense records.")) return

    try {
      const response = await fetch(`/api/member-transactions/${transactionId}/unsettle`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to unsettle transaction")
      }

      toast.success("Transaction unsettled successfully")
      fetchMemberDetails()
    } catch (error) {
      console.error("Error unsettling transaction:", error)
      toast.error(error instanceof Error ? error.message : "Failed to unsettle transaction")
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return

    try {
      const response = await fetch(`/api/member-transactions/${transactionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete transaction")
      }

      toast.success("Transaction deleted successfully")
      fetchMemberDetails()
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction")
    }
  }

  const getTransactionIcon = (type: TransactionType) => {
    if (type === "GAVE" || type === "EXPENSE_PAID_FOR_THEM") {
      return <TrendingUp className="w-4 h-4 text-green-600" />
    }
    return <TrendingDown className="w-4 h-4 text-red-600" />
  }

  const getTransactionColor = (type: TransactionType) => {
    if (type === "GAVE" || type === "EXPENSE_PAID_FOR_THEM") {
      return "text-green-600"
    }
    return "text-red-600"
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </div>
    )
  }

  if (!member) {
    return null
  }

  const unsettledTransactions = member.transactions.filter((t) => !t.isSettled)
  const settledTransactions = member.transactions.filter((t) => t.isSettled)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Members
      </Button>

      {/* Member Info Card - Glassy Design */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
        <div className="relative p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{member.name}</h1>
                <Badge className={categoryColors[member.category]}>
                  {member.category}
                </Badge>
              </div>

              <div className="space-y-2 mt-4">
                {member.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    {member.email}
                  </div>
                )}
                {member.phoneNumber && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    {member.phoneNumber}
                  </div>
                )}
                {member.notes && (
                  <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                    <FileText className="w-4 h-4 mt-1" />
                    <span>{member.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Current Balance
              </p>
              <div className="text-3xl font-bold">
                {member.currentBalance > 0 ? (
                  <span className="text-green-600 dark:text-green-400">
                    +₹{member.currentBalance.toFixed(2)}
                  </span>
                ) : member.currentBalance < 0 ? (
                  <span className="text-red-600 dark:text-red-400">
                    -₹{Math.abs(member.currentBalance).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-gray-500">₹0.00</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {member.currentBalance > 0
                  ? "They owe you"
                  : member.currentBalance < 0
                  ? "You owe them"
                  : "All settled"}
              </p>

              {/* Extra Spent/Owe from Settlements */}
              {(member.extraSpent > 0 || member.extraOwe > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-1">
                  {member.extraSpent > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-600 dark:text-amber-400">Extra Spent:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        ₹{member.extraSpent.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {member.extraOwe > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-600 dark:text-blue-400">Extra Owe:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        ₹{member.extraOwe.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                    From settlement differences
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Transaction History</h2>
        <Button onClick={handleAddTransaction} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {/* Unsettled Transactions - Glassy Design */}
      {unsettledTransactions.length > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 pointer-events-none"></div>
          <div className="relative p-6">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white mb-4">
              <XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Unsettled Transactions
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unsettledTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(new Date(transaction.date), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transactionType)}
                        <span className="text-sm">
                          {transactionTypeLabels[transaction.transactionType]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.expense ? (
                        <div className="text-sm">
                          <span className="text-blue-600">
                            {transaction.expense.title}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {transaction.description || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold ${getTransactionColor(
                          transaction.transactionType
                        )}`}
                      >
                        ₹{transaction.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.paymentMethod && (
                        <Badge variant="outline">
                          {paymentMethodLabels[transaction.paymentMethod]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSettleClick(transaction)}
                        >
                          Settle
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Settled Transactions - Glassy Design */}
      {settledTransactions.length > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
          <div className="relative p-6">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              Settled Transactions
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Settled On</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settledTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="opacity-60">
                    <TableCell>
                      {format(new Date(transaction.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {transactionTypeLabels[transaction.transactionType]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.expense ? (
                        <span className="text-sm text-blue-600">
                          {transaction.expense.title}
                        </span>
                      ) : (
                        <span className="text-sm">
                          {transaction.description || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div>₹{transaction.amount.toFixed(2)}</div>
                        {transaction.settledAmount && transaction.settledAmount !== transaction.amount && (
                          <div className="text-xs text-amber-600 dark:text-amber-400">
                            Settled: ₹{transaction.settledAmount.toFixed(2)}
                            {transaction.settlementIncomeId && " (+income)"}
                            {transaction.settlementExpenseId && " (+expense)"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.settledDate &&
                        format(new Date(transaction.settledDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {transaction.settledNotes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnsettleTransaction(transaction.id)}
                      >
                        Unsettle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Empty State - Glassy Design */}
      {member.transactions.length === 0 && (
        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 via-transparent to-slate-500/5 pointer-events-none"></div>
          <div className="relative flex flex-col items-center justify-center py-12">
            <IndianRupee className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No transactions yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Add your first transaction to start tracking
            </p>
            <Button onClick={handleAddTransaction} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
          </div>
        </div>
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record money you gave or borrowed from {member.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="transactionType">
                  Transaction Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={transactionType}
                  onValueChange={(value) => setTransactionType(value as TransactionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GAVE">You gave money</SelectItem>
                    <SelectItem value="OWE">You borrowed money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about this transaction..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Transaction"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settle Transaction Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Transaction</DialogTitle>
            <DialogDescription>
              Mark this transaction as settled. The amount will be deducted from the balance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {transactionToSettle && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Original Amount</span>
                  <span className="font-semibold">
                    ₹{transactionToSettle.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                  <span className="text-sm">
                    {transactionTypeLabels[transactionToSettle.transactionType]}
                  </span>
                </div>
              </div>
            )}

            {/* Custom Amount Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useCustomAmount"
                checked={useCustomAmount}
                onChange={(e) => setUseCustomAmount(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <Label htmlFor="useCustomAmount" className="text-sm font-medium cursor-pointer">
                Settle with custom amount
              </Label>
            </div>

            {/* Custom Amount Input */}
            {useCustomAmount && (
              <div className="space-y-2">
                <Label htmlFor="settledAmount">
                  Settlement Amount
                  <span className="text-xs text-muted-foreground ml-2">
                    (Original: ₹{transactionToSettle?.amount.toFixed(2)})
                  </span>
                </Label>
                <Input
                  id="settledAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settledAmount}
                  onChange={(e) => setSettledAmount(e.target.value)}
                  placeholder="Enter settlement amount"
                />
                {transactionToSettle && parseFloat(settledAmount) !== transactionToSettle.amount && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {parseFloat(settledAmount) > transactionToSettle.amount
                      ? `+₹${(parseFloat(settledAmount) - transactionToSettle.amount).toFixed(2)} extra will be recorded`
                      : `-₹${(transactionToSettle.amount - parseFloat(settledAmount)).toFixed(2)} less will be recorded`}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="settledNotes">Settlement Notes (Optional)</Label>
              <Textarea
                id="settledNotes"
                value={settledNotes}
                onChange={(e) => setSettledNotes(e.target.value)}
                placeholder="Optional notes about settlement..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettleDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSettleTransaction} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Settling...
                </>
              ) : (
                "Settle Transaction"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
