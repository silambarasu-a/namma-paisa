"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, User, Calendar, Plus, TrendingUp, ChevronDown, ChevronUp } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"

const fundFormSchema = z.object({
  lenderName: z.string().min(1, "Lender name is required"),
  memberId: z.string().optional(),
  borrowedAmount: z
    .string()
    .min(1, "Borrowed amount is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Borrowed amount must be a positive number"
    ),
  borrowedDate: z.string().min(1, "Borrowed date is required"),
  expectedReturnDate: z.string().optional(),
  transactionIds: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  terms: z.string().optional(),
  interestRate: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "Interest rate must be between 0 and 100"
    ),
  notes: z.string().optional(),
})

type FundFormData = z.infer<typeof fundFormSchema>

interface Member {
  id: string
  name: string
}

interface Transaction {
  id: string
  symbol: string
  name: string
  qty: number
  price: number
  amount: number
  currency: string
  amountInr?: number | null
  purchaseDate: string
  transactionType: string
  bucket: string
  holding: {
    id: string
    name: string
    symbol: string
  } | null
}

interface AddFundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  fund?: {
    id: string
    lenderName: string
    memberId?: string | null
    borrowedAmount: number
    borrowedDate: string
    expectedReturnDate?: string | null
    transactionIds?: string[]
    purpose?: string | null
    terms?: string | null
    interestRate?: number | null
    notes?: string | null
  }
}

export function AddFundModal({
  open,
  onOpenChange,
  onSuccess,
  fund,
}: AddFundModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [showNewMemberForm, setShowNewMemberForm] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [creatingMember, setCreatingMember] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [showTransactionList, setShowTransactionList] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FundFormData>({
    resolver: zodResolver(fundFormSchema),
    defaultValues: {
      borrowedDate: new Date().toISOString().split("T")[0],
    },
  })

  const memberId = watch("memberId")

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/members?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log("Fetched members - raw response:", data)
        console.log("Is array?", Array.isArray(data))
        // Handle both array response and object with members property
        let membersArray: Member[] = []
        if (Array.isArray(data)) {
          membersArray = data
        } else if (data && typeof data === 'object' && 'members' in data) {
          membersArray = Array.isArray(data.members) ? data.members : []
        } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          // If it's an object, it might be the members directly
          membersArray = data
        }
        console.log("Setting members to:", membersArray)
        setMembers(membersArray)
      } else {
        console.error("Failed to fetch members:", response.status)
        setMembers([])
      }
    } catch (error) {
      console.error("Error fetching members:", error)
      setMembers([])
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/investments/transactions?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log("Fetched transactions:", data)
        setTransactions(Array.isArray(data) ? data : [])
      } else {
        console.error("Failed to fetch transactions:", response.status)
        setTransactions([])
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      setTransactions([])
    }
  }

  const handleCreateMember = async () => {
    if (!newMemberName.trim()) {
      toast.error("Please enter a member name")
      return
    }

    try {
      setCreatingMember(true)
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          category: "OTHER",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create member")
      }

      const newMember = await response.json()
      toast.success("Member created successfully")

      // Add new member to list and select it
      setMembers([...members, newMember])
      setValue("memberId", newMember.id)

      // Reset form
      setNewMemberName("")
      setShowNewMemberForm(false)
    } catch (error) {
      console.error("Error creating member:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to create member"
      )
    } finally {
      setCreatingMember(false)
    }
  }

  useEffect(() => {
    if (open) {
      setLoadingData(true)
      Promise.all([fetchMembers(), fetchTransactions()])
        .finally(() => setLoadingData(false))

      if (fund) {
        // Populate form for editing
        setValue("lenderName", fund.lenderName)
        setValue("memberId", fund.memberId || undefined)
        setValue("borrowedAmount", fund.borrowedAmount.toString())
        setValue("borrowedDate", fund.borrowedDate.split("T")[0])
        setValue(
          "expectedReturnDate",
          fund.expectedReturnDate?.split("T")[0] || ""
        )
        setValue("transactionIds", fund.transactionIds || [])
        setSelectedTransactions(fund.transactionIds || [])
        setValue("purpose", fund.purpose || "")
        setValue("terms", fund.terms || "")
        setValue("interestRate", fund.interestRate?.toString() || "")
        setValue("notes", fund.notes || "")
      } else {
        reset({
          borrowedDate: new Date().toISOString().split("T")[0],
          memberId: undefined,
          transactionIds: [],
        })
        setSelectedTransactions([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fund])

  const onSubmit = async (data: FundFormData) => {
    try {
      setIsLoading(true)

      const payload = {
        lenderName: data.lenderName,
        memberId: data.memberId || undefined,
        borrowedAmount: Number(data.borrowedAmount),
        borrowedDate: data.borrowedDate,
        expectedReturnDate: data.expectedReturnDate || undefined,
        transactionIds: selectedTransactions,
        purpose: data.purpose || undefined,
        terms: data.terms || undefined,
        interestRate: data.interestRate ? Number(data.interestRate) : undefined,
        notes: data.notes || undefined,
      }

      const url = fund
        ? `/api/borrowed-funds/${fund.id}`
        : "/api/borrowed-funds"
      const method = fund ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${fund ? "update" : "create"} borrowed fund`)
      }

      toast.success(
        fund
          ? "Borrowed fund updated successfully"
          : "Borrowed fund created successfully"
      )
      onSuccess()
      onOpenChange(false)
      reset()
    } catch (error) {
      console.error("Error saving borrowed fund:", error)
      toast.error(
        error instanceof Error ? error.message : `Failed to ${fund ? "update" : "create"} borrowed fund`
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh] flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {fund ? "Edit Borrowed Fund" : "Add Borrowed Fund"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {fund
              ? "Update the details of your borrowed fund"
              : "Track money borrowed from others and your investments"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
          {/* Lender Information */}
          <div className="space-y-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border border-border/50">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Lender Information
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lenderName">
                  Lender Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lenderName"
                  {...register("lenderName")}
                  placeholder="e.g., John Doe"
                  className="bg-background"
                />
                {errors.lenderName && (
                  <p className="text-sm text-destructive">
                    {errors.lenderName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="memberId">Link to Member (Optional)</Label>

                {showNewMemberForm ? (
                  <div className="space-y-2 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                        placeholder="Enter member name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleCreateMember()
                          }
                        }}
                        disabled={creatingMember}
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateMember}
                          disabled={creatingMember || !newMemberName.trim()}
                          className="flex-1 sm:flex-none"
                        >
                          {creatingMember ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Create"
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowNewMemberForm(false)
                            setNewMemberName("")
                          }}
                          disabled={creatingMember}
                          className="flex-1 sm:flex-none"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Enter or click Create to add new member
                    </p>
                  </div>
                ) : (
                  <>
                    <Select
                      value={memberId || "none"}
                      onValueChange={(value) => {
                        console.log("Member selected:", value)
                        if (value === "create-new") {
                          setShowNewMemberForm(true)
                        } else {
                          setValue("memberId", value === "none" ? undefined : value)
                        }
                      }}
                      disabled={loadingData}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={loadingData ? "Loading members..." : "Select a member"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="create-new" className="text-primary font-medium">
                          <div className="flex items-center">
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Member
                          </div>
                        </SelectItem>
                        {members.length === 0 && !loadingData && (
                          <SelectItem value="no-members" disabled>
                            No members found
                          </SelectItem>
                        )}
                        {members.map((member) => {
                          console.log("Rendering member:", member.name, member.id)
                          return (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {members.length > 0 && (
                      <p className="text-xs text-green-600">
                        {members.length} member(s) available
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Amount & Dates */}
          <div className="space-y-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border border-border/50">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Amount & Timeline
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="borrowedAmount">
                  Borrowed Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="borrowedAmount"
                    {...register("borrowedAmount")}
                    placeholder="100000"
                    type="number"
                    step="0.01"
                    className="pl-7 bg-background"
                  />
                </div>
                {errors.borrowedAmount && (
                  <p className="text-sm text-destructive">
                    {errors.borrowedAmount.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="borrowedDate">
                  Borrowed Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="borrowedDate"
                  {...register("borrowedDate")}
                  type="date"
                  className="bg-background"
                />
                {errors.borrowedDate && (
                  <p className="text-sm text-destructive">
                    {errors.borrowedDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                <Input
                  id="expectedReturnDate"
                  {...register("expectedReturnDate")}
                  type="date"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty if indefinite
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                {...register("interestRate")}
                placeholder="0"
                type="number"
                step="0.01"
                className="bg-background"
              />
              {errors.interestRate && (
                <p className="text-sm text-destructive">
                  {errors.interestRate.message}
                </p>
              )}
            </div>
          </div>

          {/* Transaction Linking */}
          <div className="space-y-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Link Transactions (Optional)
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTransactionList(!showTransactionList)}
                className="h-auto py-1 px-2"
              >
                {showTransactionList ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {selectedTransactions.length > 0 && (
              <div className="text-sm text-green-600 dark:text-green-400">
                {selectedTransactions.length} transaction{selectedTransactions.length > 1 ? 's' : ''} selected
              </div>
            )}

            {showTransactionList && (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-background">
                {loadingData ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No transactions found
                  </p>
                ) : (
                  transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Checkbox
                        id={txn.id}
                        checked={selectedTransactions.includes(txn.id)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedTransactions([...selectedTransactions, txn.id])
                          } else {
                            setSelectedTransactions(selectedTransactions.filter(id => id !== txn.id))
                          }
                        }}
                        className="mt-1"
                      />
                      <label
                        htmlFor={txn.id}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {txn.symbol} - {txn.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {txn.transactionType} • {txn.qty} @ {txn.currency === "USD" ? "$" : "₹"}{txn.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(txn.purchaseDate), "PP")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">
                              ₹{(txn.currency === "USD" && txn.amountInr ? txn.amountInr : txn.amount).toLocaleString()}
                            </p>
                            {txn.currency === "USD" && txn.amountInr && (
                              <p className="text-xs text-muted-foreground">
                                ${txn.amount.toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {txn.bucket}
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}

            {!showTransactionList && transactions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Click to expand and select transactions funded by this borrowed money
              </p>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border border-border/50">
            <h3 className="font-semibold">Additional Details</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  {...register("purpose")}
                  placeholder="e.g., Emergency medical expense"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  {...register("terms")}
                  placeholder="Any specific terms or agreements..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional notes..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>
            </div>
          </div>
          </div>

          {/* Actions - Fixed Footer */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  reset()
                }}
                className="flex-1 order-2 sm:order-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {fund ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>{fund ? "Update Fund" : "Create Fund"}</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
