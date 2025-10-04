"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { toast } from "sonner"
import { ArrowLeft, Calendar, IndianRupee, Loader2, CheckCircle, DollarSign, Clock, Edit, Trash2 } from "lucide-react"
import { format } from "date-fns"
import type { Loan, EMI } from "@/types"
import { PayEmiModal } from "@/components/loans/pay-emi-modal"
import { CloseLoanModal } from "@/components/loans/close-loan-modal"
import { EditEmiModal } from "@/components/loans/edit-emi-modal"
import { getLoanTypeLabel, getFrequencyLabel } from "@/constants"

export default function LoanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const loanId = params.id as string

  const [loan, setLoan] = useState<Loan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [payEmiModal, setPayEmiModal] = useState<{
    open: boolean
    loanId: string
    emiId: string
    emiAmount: number
    dueDate: Date
  } | null>(null)
  const [closeLoanModal, setCloseLoanModal] = useState<{
    open: boolean
    loanId: string
    currentOutstanding: number
  } | null>(null)
  const [editEmiModal, setEditEmiModal] = useState<{
    open: boolean
    loanId: string
    emiId: string
    currentData: {
      paidAmount: number
      paidDate: string
      principalPaid?: number | null
      interestPaid?: number | null
      lateFee?: number | null
      paymentMethod: "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER"
      paymentNotes?: string | null
    }
  } | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    loanId: string
    emiId: string
    emiDueDate: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchLoan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId])

  const fetchLoan = async () => {
    try {
      setIsLoading(true)
      // Add cache-busting parameter
      const response = await fetch(`/api/loans/${loanId}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch loan")
      }

      const data = await response.json()
      setLoan(data)
    } catch (error) {
      console.error("Error fetching loan:", error)
      toast.error("Failed to load loan details")
      router.push("/loans")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePayment = async () => {
    if (!deleteConfirmation) return

    try {
      setIsDeleting(true)
      const response = await fetch(
        `/api/loans/${deleteConfirmation.loanId}/emis/${deleteConfirmation.emiId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete payment")
      }

      const result = await response.json()
      toast.success(result.message || "Payment deleted successfully")
      setDeleteConfirmation(null)
      fetchLoan()
    } catch (error) {
      console.error("Error deleting payment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete payment")
    } finally {
      setIsDeleting(false)
    }
  }

  const getPaidEmis = (emis: EMI[]) => {
    return emis.filter(emi => emi.isPaid).sort((a, b) =>
      new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime()
    )
  }

  const getCurrentMonthEmi = (emis: EMI[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return emis.find(emi => {
      const emiDate = new Date(emi.dueDate)
      return emiDate.getMonth() === currentMonth && emiDate.getFullYear() === currentYear
    })
  }

  const getOtherUnpaidEmis = (emis: EMI[], currentMonthEmiId?: string) => {
    return emis.filter(emi =>
      !emi.isPaid && emi.id !== currentMonthEmiId
    ).sort((a, b) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <div className="text-center py-12 px-4">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Loan not found</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">The loan you're looking for doesn't exist or has been removed.</p>
            <Button
              onClick={() => router.push("/loans")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Loans
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentMonthEmi = getCurrentMonthEmi(loan.emis)
  const otherUnpaidEmis = getOtherUnpaidEmis(loan.emis, currentMonthEmi?.id)
  const paidEmis = getPaidEmis(loan.emis)

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/loans")}
          className="w-fit bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Loans
        </Button>
        {!loan.isClosed && loan.isActive && (
          <Button
            onClick={() => setCloseLoanModal({
              open: true,
              loanId: loan.id,
              currentOutstanding: loan.currentOutstanding,
            })}
            className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Close Loan
          </Button>
        )}
      </div>

      {/* Loan Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 via-white/60 to-blue-50/60 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-blue-900/20 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        <div className="relative p-4 sm:p-6">
          {/* Header Section */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {getLoanTypeLabel(loan.loanType)}
                </h1>
                <Badge
                  variant={loan.isActive ? "default" : "secondary"}
                  className="px-3 py-1 bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm"
                >
                  {loan.isActive ? "Active" : "Inactive"}
                </Badge>
                {loan.isClosed && (
                  <Badge className="px-3 py-1 bg-green-100/80 text-green-700 border-green-200/50 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50 backdrop-blur-sm">
                    Closed
                  </Badge>
                )}
              </div>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 font-medium">{loan.institution}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">A/c: {loan.accountHolderName}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Principal Amount</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                ₹{loan.principalAmount.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">EMI Amount</p>
              <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                ₹{loan.emiAmount.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frequency</p>
              <p className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">
                {getFrequencyLabel(loan.emiFrequency)}
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-red-200/50 dark:border-red-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Outstanding</p>
              <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
                ₹{loan.currentOutstanding.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Paid</p>
              <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                ₹{loan.totalPaid.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interest Rate</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {loan.interestRate}%
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tenure</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {loan.tenure} months
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-orange-200/50 dark:border-orange-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
              <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">
                {loan.remainingTenure || 0} months
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {format(new Date(loan.startDate), "MMM dd, yyyy")}
              </p>
            </div>
            {loan.isClosed && loan.closedAt && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 border border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Closed On</p>
                <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                  {format(new Date(loan.closedAt), "MMM dd, yyyy")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gold Items Pledged - Only for Gold Loans */}
      {loan.loanType === "GOLD_LOAN" && loan.goldItems && loan.goldItems.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-50/80 via-amber-50/60 to-white/60 dark:from-yellow-900/20 dark:via-amber-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
          <div className="relative p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6" />
                Gold Items Pledged
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Details of gold items used as collateral for this loan
              </p>
            </div>
            <div className="space-y-3">
              {loan.goldItems.map((item) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base sm:text-lg font-bold text-yellow-900 dark:text-yellow-100">
                      {item.title}
                    </h4>
                    <Badge className="px-3 py-1 bg-yellow-100/80 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-300/50 dark:border-yellow-700/50 backdrop-blur-sm">
                      {item.carat}K Gold
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.quantity} {item.quantity === 1 ? "pc" : "pcs"}
                      </p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gross Weight</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.grossWeight}g
                      </p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Weight</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.netWeight}g
                      </p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-yellow-200/50 dark:border-yellow-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Carat</p>
                      <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                        {item.carat}K
                      </p>
                    </div>
                    {item.loanAmount && (
                      <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-green-200/50 dark:border-green-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Loan Amount</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          ₹{item.loanAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Month EMI */}
      {currentMonthEmi && !loan.isClosed && (
        <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border shadow-xl transition-all ${
          currentMonthEmi.isPaid
            ? 'bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 border-green-200/50 dark:border-green-700/50'
            : 'bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-white/60 dark:from-amber-900/20 dark:via-orange-900/10 dark:to-gray-800/60 border-amber-200/50 dark:border-amber-700/50'
        }`}>
          <div className={`absolute inset-0 pointer-events-none ${
            currentMonthEmi.isPaid
              ? 'bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5'
              : 'bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5'
          }`}></div>
          <div className="relative p-4 sm:p-6">
            <div className="mb-4">
              <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${
                currentMonthEmi.isPaid ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'
              }`}>
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                Current Month EMI
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                EMI for {format(new Date(currentMonthEmi.dueDate), "MMMM yyyy")}
              </p>
            </div>
            <div
              className={`flex flex-col gap-3 p-4 rounded-xl border backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between transition-all ${
                currentMonthEmi.isPaid
                  ? 'bg-green-50/80 dark:bg-green-950/40 border-green-300/50 dark:border-green-700/50 shadow-lg shadow-green-500/20'
                  : 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/50 shadow-lg shadow-amber-500/20'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 flex-1">
                <div className="flex items-center gap-3">
                  {currentMonthEmi.isPaid && (
                    <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400 flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-3">
                    <IndianRupee className={`h-5 w-5 ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
                    <div>
                      <p className={`text-xl font-bold ${currentMonthEmi.isPaid ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                        ₹{currentMonthEmi.emiAmount.toLocaleString()}
                      </p>
                      <p className={`text-xs ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        EMI Amount
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className={`h-5 w-5 ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
                  <div>
                    <p className={`text-base font-bold ${currentMonthEmi.isPaid ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                      {format(new Date(currentMonthEmi.dueDate), "MMM dd, yyyy")}
                    </p>
                    <p className={`text-xs ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Due Date
                    </p>
                  </div>
                </div>
              </div>
              {currentMonthEmi.isPaid ? (
                <div className="flex items-center gap-2 px-5 py-3 bg-green-100/80 dark:bg-green-900/50 rounded-xl border border-green-400/50 dark:border-green-600/50 backdrop-blur-sm shadow-lg shadow-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-700 dark:text-green-300" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-green-700 dark:text-green-300">
                      PAID
                    </p>
                    {currentMonthEmi.paidDate && (
                      <p className="text-xs font-normal text-green-600 dark:text-green-400">
                        on {format(new Date(currentMonthEmi.paidDate), "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
                  onClick={() => setPayEmiModal({
                    open: true,
                    loanId: loan.id,
                    emiId: currentMonthEmi.id,
                    emiAmount: currentMonthEmi.emiAmount,
                    dueDate: new Date(currentMonthEmi.dueDate),
                  })}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other Unpaid EMIs */}
      {otherUnpaidEmis.length > 0 && !loan.isClosed && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 via-gray-50/60 to-blue-50/60 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
          <div className="relative p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
                Upcoming Payments ({otherUnpaidEmis.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Future EMIs that are yet to be paid
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {otherUnpaidEmis.map((emi) => (
                <div
                  key={emi.id}
                  className="flex flex-col gap-3 p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100/80 dark:bg-blue-900/40 rounded-lg backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                        <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold text-gray-900 dark:text-white">
                          ₹{emi.emiAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">EMI Amount</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100/80 dark:bg-purple-900/40 rounded-lg backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {format(new Date(emi.dueDate), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200/50 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 backdrop-blur-sm"
                    onClick={() => setPayEmiModal({
                      open: true,
                      loanId: loan.id,
                      emiId: emi.id,
                      emiAmount: emi.emiAmount,
                      dueDate: new Date(emi.dueDate),
                    })}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Pay EMI
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paid EMIs */}
      {paidEmis.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
          <div className="relative p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-green-800 dark:text-green-300">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                Payment History ({paidEmis.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                EMIs that have been successfully paid
              </p>
            </div>
            <div className="space-y-3">
              {paidEmis.map((emi) => (
                <div
                  key={emi.id}
                  className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-green-200/50 dark:border-green-700/50 rounded-xl p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        Payment Details
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditEmiModal({
                          open: true,
                          loanId: loan.id,
                          emiId: emi.id,
                          currentData: {
                            paidAmount: emi.paidAmount || emi.emiAmount,
                            paidDate: emi.paidDate || "",
                            principalPaid: emi.principalPaid,
                            interestPaid: emi.interestPaid,
                            lateFee: emi.lateFee,
                            paymentMethod: emi.paymentMethod || "CASH",
                            paymentNotes: emi.paymentNotes,
                          },
                        })}
                        className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 dark:hover:bg-blue-900/30"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmation({
                          open: true,
                          loanId: loan.id,
                          emiId: emi.id,
                          emiDueDate: format(new Date(emi.dueDate), "MMM dd, yyyy"),
                        })}
                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50/80 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">EMI Amount</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ₹{emi.emiAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-green-200/50 dark:border-green-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paid Amount</p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        ₹{(emi.paidAmount || emi.emiAmount).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {format(new Date(emi.dueDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-green-200/50 dark:border-green-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paid Date</p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {emi.paidDate ? format(new Date(emi.paidDate), "MMM dd, yyyy") : "-"}
                      </p>
                    </div>
                    {emi.principalPaid && (
                      <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-blue-200/50 dark:border-blue-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Principal</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          ₹{emi.principalPaid.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {emi.interestPaid && (
                      <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-purple-200/50 dark:border-purple-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interest</p>
                        <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          ₹{emi.interestPaid.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {emi.lateFee && (
                      <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-red-200/50 dark:border-red-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Late Fee</p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                          ₹{emi.lateFee.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {emi.paymentMethod && (
                      <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Method</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {emi.paymentMethod.replace("_", " ")}
                        </p>
                      </div>
                    )}
                  </div>
                  {emi.paymentNotes && (
                    <div className="mt-3 pt-3 border-t border-green-200/50 dark:border-green-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">{emi.paymentNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {payEmiModal && (
        <PayEmiModal
          open={payEmiModal.open}
          onOpenChange={(open) => !open && setPayEmiModal(null)}
          loanId={payEmiModal.loanId}
          emiId={payEmiModal.emiId}
          emiAmount={payEmiModal.emiAmount}
          dueDate={payEmiModal.dueDate}
          onSuccess={() => {
            fetchLoan()
            setPayEmiModal(null)
          }}
        />
      )}

      {closeLoanModal && (
        <CloseLoanModal
          open={closeLoanModal.open}
          onOpenChange={(open) => !open && setCloseLoanModal(null)}
          loanId={closeLoanModal.loanId}
          currentOutstanding={closeLoanModal.currentOutstanding}
          onSuccess={() => {
            fetchLoan()
            setCloseLoanModal(null)
          }}
        />
      )}

      {editEmiModal && (
        <EditEmiModal
          open={editEmiModal.open}
          onOpenChange={(open) => !open && setEditEmiModal(null)}
          loanId={editEmiModal.loanId}
          emiId={editEmiModal.emiId}
          currentData={editEmiModal.currentData}
          onSuccess={() => {
            fetchLoan()
            setEditEmiModal(null)
          }}
        />
      )}

      <AlertDialog
        open={deleteConfirmation?.open || false}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record for EMI due on{" "}
              <span className="font-semibold">{deleteConfirmation?.emiDueDate}</span>?
              <br /><br />
              This will mark the EMI as unpaid and adjust the loan totals accordingly.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Payment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
