"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { AddFundModal } from "@/components/borrowed-funds/add-fund-modal"
import { ReturnFundModal } from "@/components/borrowed-funds/return-fund-modal"
import { toast } from "sonner"
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  IndianRupee,
  Loader2,
  TrendingUp,
  TrendingDown,
  User,
  Wallet,
  CheckCircle,
  Clock,
  ArrowLeft,
  DollarSign,
} from "lucide-react"
import { format } from "date-fns"

interface BorrowedFund {
  id: string
  lenderName: string
  borrowedAmount: number
  borrowedDate: string
  expectedReturnDate: string | null
  actualReturnDate: string | null
  returnedAmount: number
  isFullyReturned: boolean
  currentValue: number | null
  profitLoss: number | null
  purpose: string | null
  terms: string | null
  interestRate: number | null
  notes: string | null
  transactionIds: string[]
  member: {
    id: string
    name: string
  } | null
}

export default function BorrowedFundsPage() {
  const [funds, setFunds] = useState<BorrowedFund[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    fundId: string
    lenderName: string
  } | null>(null)
  const [addFundModal, setAddFundModal] = useState(false)
  const [editingFund, setEditingFund] = useState<BorrowedFund | null>(null)
  const [returnModal, setReturnModal] = useState<{
    open: boolean
    fund: BorrowedFund
  } | null>(null)

  useEffect(() => {
    fetchFunds()
  }, [])

  const fetchFunds = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/borrowed-funds?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch borrowed funds")
      }

      const data = await response.json()
      setFunds(data)
    } catch (error) {
      console.error("Error fetching borrowed funds:", error)
      toast.error("Failed to load borrowed funds")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (fundId: string) => {
    try {
      setDeletingId(fundId)
      const response = await fetch(`/api/borrowed-funds/${fundId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete borrowed fund")
      }

      toast.success("Borrowed fund deleted successfully")
      fetchFunds()
    } catch (error) {
      console.error("Error deleting borrowed fund:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete borrowed fund"
      )
    } finally {
      setDeletingId(null)
      setDeleteConfirmation(null)
    }
  }

  const activeFunds = funds.filter((f) => !f.isFullyReturned)
  const returnedFunds = funds.filter((f) => f.isFullyReturned)

  const totalBorrowed = activeFunds.reduce((sum, f) => sum + f.borrowedAmount, 0)
  const totalReturned = activeFunds.reduce((sum, f) => sum + f.returnedAmount, 0)
  const totalOutstanding = totalBorrowed - totalReturned
  const totalProfit = activeFunds.reduce(
    (sum, f) => sum + (f.profitLoss || 0),
    0
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Borrowed Funds
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track money borrowed from others and your investments
          </p>
        </div>
        <Button
          onClick={() => setAddFundModal(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Borrowed Fund
        </Button>
      </div>

      {/* Summary Cards */}
      {activeFunds.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Funds */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100/80 dark:bg-blue-900/40 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Active Funds
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeFunds.length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {returnedFunds.length} completed
              </p>
            </div>
          </div>

          {/* Total Borrowed */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100/80 dark:bg-orange-900/40 backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/50 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Borrowed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{totalBorrowed.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Across all active funds
              </p>
            </div>
          </div>

          {/* Outstanding */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Outstanding
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{totalOutstanding.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {totalReturned > 0 ? `₹${totalReturned.toLocaleString()} returned` : "No returns yet"}
              </p>
            </div>
          </div>

          {/* Profit/Loss */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100/80 dark:bg-green-900/40 backdrop-blur-sm border border-green-200/50 dark:border-green-700/50 flex items-center justify-center">
                  {totalProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Profit/Loss
                  </p>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {totalProfit >= 0 ? "+" : ""}₹{totalProfit.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                From investments
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Funds List */}
      {activeFunds.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Active Borrowed Funds
          </h2>
          <div className="space-y-4">
            {activeFunds.map((fund) => {
              const outstanding = fund.borrowedAmount - fund.returnedAmount
              const returnProgress =
                (fund.returnedAmount / fund.borrowedAmount) * 100

              return (
                <div
                  key={fund.id}
                  className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="space-y-4 flex-1">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100/80 dark:bg-blue-900/40 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {fund.lenderName}
                            </h3>
                            {fund.member && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Member: {fund.member.name}
                              </p>
                            )}
                            {fund.purpose && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {fund.purpose}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Borrowed
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              ₹{fund.borrowedAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Returned
                            </p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              ₹{fund.returnedAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Outstanding
                            </p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              ₹{outstanding.toLocaleString()}
                            </p>
                          </div>
                          {fund.profitLoss !== null && (
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Profit/Loss
                              </p>
                              <p
                                className={`text-lg font-bold ${fund.profitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {fund.profitLoss >= 0 ? "+" : ""}₹
                                {fund.profitLoss.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {returnProgress > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                Return Progress
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {returnProgress.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${returnProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(fund.borrowedDate), "PP")}
                          </Badge>
                          {fund.expectedReturnDate && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Due: {format(new Date(fund.expectedReturnDate), "PP")}
                            </Badge>
                          )}
                          {fund.transactionIds && fund.transactionIds.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Wallet className="h-3 w-3 mr-1" />
                              {fund.transactionIds.length} transaction{fund.transactionIds.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {fund.interestRate && (
                            <Badge variant="secondary" className="text-xs">
                              {fund.interestRate}% interest
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnModal({ open: true, fund })}
                          className="flex-1 lg:flex-none"
                        >
                          <ArrowLeft className="h-4 w-4 lg:mr-0 mr-1" />
                          <span className="lg:hidden">Return</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingFund(fund)}
                          className="flex-1 lg:flex-none"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDeleteConfirmation({
                              open: true,
                              fundId: fund.id,
                              lenderName: fund.lenderName,
                            })
                          }
                          disabled={deletingId === fund.id}
                          className="flex-1 lg:flex-none"
                        >
                          {deletingId === fund.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Returned Funds */}
      {returnedFunds.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Returned Funds
          </h2>
          <div className="space-y-4">
            {returnedFunds.map((fund) => (
              <div
                key={fund.id}
                className="relative overflow-hidden rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 opacity-60"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {fund.lenderName}
                        </h3>
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                          Completed
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Amount</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ₹{fund.borrowedAmount.toLocaleString()}
                          </p>
                        </div>
                        {fund.profitLoss !== null && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Final P&L</p>
                            <p
                              className={`font-semibold ${fund.profitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                            >
                              {fund.profitLoss >= 0 ? "+" : ""}₹
                              {fund.profitLoss.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {fund.actualReturnDate && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Returned On</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {format(new Date(fund.actualReturnDate), "PP")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {funds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Borrowed Funds Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
              Start tracking money you borrow from others and monitor your
              investment performance.
            </p>
            <Button onClick={() => setAddFundModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Borrowed Fund
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AddFundModal
        open={addFundModal || editingFund !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddFundModal(false)
            setEditingFund(null)
          }
        }}
        onSuccess={() => {
          fetchFunds()
          setEditingFund(null)
        }}
        fund={
          editingFund
            ? {
                id: editingFund.id,
                lenderName: editingFund.lenderName,
                memberId: editingFund.member?.id,
                borrowedAmount: editingFund.borrowedAmount,
                borrowedDate: editingFund.borrowedDate,
                expectedReturnDate: editingFund.expectedReturnDate,
                transactionIds: editingFund.transactionIds,
                purpose: editingFund.purpose,
                terms: editingFund.terms,
                interestRate: editingFund.interestRate,
                notes: editingFund.notes,
              }
            : undefined
        }
      />

      {returnModal && (
        <ReturnFundModal
          open={returnModal.open}
          onOpenChange={(open) => !open && setReturnModal(null)}
          onSuccess={fetchFunds}
          fund={{
            id: returnModal.fund.id,
            lenderName: returnModal.fund.lenderName,
            borrowedAmount: returnModal.fund.borrowedAmount,
            returnedAmount: returnModal.fund.returnedAmount,
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirmation?.open || false}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the borrowed fund record for{" "}
              <strong>{deleteConfirmation?.lenderName}</strong>. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirmation && handleDelete(deleteConfirmation.fundId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
