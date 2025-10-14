"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"
import { Plus, Edit, Trash2, Calendar, Building2, IndianRupee, Loader2, CheckCircle, DollarSign, Eye, ChevronDown, ChevronUp, Wallet } from "lucide-react"
import { format } from "date-fns"
import type { Loan, EMI } from "@/types"
import { PayEmiModal } from "@/components/loans/pay-emi-modal"
import { CloseLoanModal } from "@/components/loans/close-loan-modal"
import { AddLoanModal } from "@/components/loans/add-loan-modal"
import { getLoanTypeLabel, getFrequencyLabel } from "@/constants"

export default function LoansPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null)
  const [addLoanModalOpen, setAddLoanModalOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
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
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    loanId: string
    loanType: string
    institution: string
  } | null>(null)

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/loans?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch loans")
      }

      const data = await response.json()
      setLoans(data)
    } catch (error) {
      console.error("Error fetching loans:", error)
      toast.error("Failed to load loans")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditLoan = async (loanId: string) => {
    try {
      const response = await fetch(`/api/loans/${loanId}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch loan details")
      }

      const fullLoanData = await response.json()
      setEditingLoan(fullLoanData)
    } catch (error) {
      console.error("Error fetching loan for edit:", error)
      toast.error("Failed to load loan details")
    }
  }

  const handleDeleteClick = (loan: Loan, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmation({
      open: true,
      loanId: loan.id,
      loanType: getLoanTypeLabel(loan.loanType),
      institution: loan.institution,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return

    try {
      setDeletingId(deleteConfirmation.loanId)
      const response = await fetch(`/api/loans/${deleteConfirmation.loanId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete loan")
      }

      toast.success("Loan deleted successfully")
      setDeleteConfirmation(null)
      fetchLoans()
    } catch (error) {
      console.error("Error deleting loan:", error)
      toast.error("Failed to delete loan")
    } finally {
      setDeletingId(null)
    }
  }

  const toggleExpand = (loanId: string) => {
    setExpandedLoanId(expandedLoanId === loanId ? null : loanId)
  }

  const getCurrentAndUpcomingEMIs = (emis: EMI[]) => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Get overdue unpaid EMIs (from previous months)
    const overdueEmis = emis.filter(emi => {
      const emiDate = new Date(emi.dueDate)
      return !emi.isPaid && emiDate < currentMonthStart
    })

    // Get EMIs for current month (paid or unpaid)
    const currentMonthEmis = emis.filter(emi => {
      const emiDate = new Date(emi.dueDate)
      return emiDate >= currentMonthStart && emiDate <= currentMonthEnd
    })

    // Get upcoming unpaid EMIs (future months)
    const upcomingUnpaidEmis = emis.filter(emi => {
      const emiDate = new Date(emi.dueDate)
      return !emi.isPaid && emiDate > currentMonthEnd
    }).slice(0, 3) // Show 3 upcoming unpaid EMIs

    // Combine overdue + current month + upcoming EMIs, remove duplicates
    const combined = [...overdueEmis, ...currentMonthEmis, ...upcomingUnpaidEmis]
    const unique = Array.from(new Map(combined.map(emi => [emi.id, emi])).values())

    return unique
  }

  // Calculate summary statistics (excluding closed loans)
  const totalLoanAmount = loans.reduce((sum, loan) => {
    if (loan.isClosed || !loan.isActive) return sum
    return sum + loan.principalAmount
  }, 0)
  const totalOutstanding = loans.reduce((sum, loan) => {
    if (loan.isClosed || !loan.isActive) return sum
    return sum + loan.currentOutstanding
  }, 0)

  const currentMonthEMITotal = loans.reduce((sum, loan) => {
    if (loan.isClosed || !loan.isActive) return sum
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const currentMonthEmi = loan.emis.find(emi => {
      const emiDate = new Date(emi.dueDate)
      return emiDate.getMonth() === currentMonth &&
             emiDate.getFullYear() === currentYear
    })

    return sum + (currentMonthEmi ? currentMonthEmi.emiAmount : 0)
  }, 0)

  const currentMonthPaidEMITotal = loans.reduce((sum, loan) => {
    if (loan.isClosed || !loan.isActive) return sum
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const currentMonthEmi = loan.emis.find(emi => {
      const emiDate = new Date(emi.dueDate)
      return emiDate.getMonth() === currentMonth &&
             emiDate.getFullYear() === currentYear && emi.isPaid
    })

    return sum + (currentMonthEmi ? currentMonthEmi.emiAmount : 0)
  }, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Loans</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your loans and track EMI payments
          </p>
        </div>
        <Button onClick={() => setAddLoanModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add New Loan
        </Button>
      </div>

      {/* Summary Cards */}
      {loans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Loan Amount */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-white/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-blue-100/80 dark:bg-blue-900/40 rounded-xl backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Loan Amount</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{totalLoanAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50/80 via-rose-50/60 to-white/60 dark:from-red-900/20 dark:via-rose-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-red-200/50 dark:border-red-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-red-100/80 dark:bg-red-900/40 rounded-xl backdrop-blur-sm border border-red-200/50 dark:border-red-700/50">
                  <DollarSign className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ₹{totalOutstanding.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Month EMI */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100/80 dark:bg-green-900/40 rounded-xl backdrop-blur-sm border border-green-200/50 dark:border-green-700/50">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Month EMI</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₹{currentMonthEMITotal.toLocaleString()}
                  </p>
                  <span className="text-xs text-muted-foreground mt-1">₹{currentMonthPaidEMITotal.toLocaleString()} (Paid)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Loans Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              You haven&apos;t added any loans yet. Start by adding your first loan.
            </p>
            <Button onClick={() => setAddLoanModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const isExpanded = expandedLoanId === loan.id
            const currentAndUpcomingEmis = getCurrentAndUpcomingEMIs(loan.emis)

            return (
              <div
                key={loan.id}
                className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
              >
                <div className="p-3 sm:p-4">
                  {/* Compact Header */}
                  <div
                    className="flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => toggleExpand(loan.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                            {getLoanTypeLabel(loan.loanType)}
                          </h3>
                          {loan.isClosed && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300">
                              Closed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{loan.institution}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">A/c: {loan.accountHolderName}</p>
                      </div>
                    </div>

                    {/* Compact Info Pills */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                      {(() => {
                        const now = new Date()
                        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

                        // First priority: Check for overdue unpaid EMIs
                        const overdueEmi = loan.emis?.find(emi => {
                          const emiDate = new Date(emi.dueDate)
                          return !emi.isPaid && emiDate < currentMonthStart
                        })

                        // Second priority: Check for current month EMI
                        const currentMonthEmi = !overdueEmi ? loan.emis?.find(emi => {
                          const emiDate = new Date(emi.dueDate)
                          return emiDate >= currentMonthStart && emiDate <= currentMonthEnd
                        }) : null

                        // Third priority: Get the next upcoming unpaid EMI
                        const upcomingEmi = !overdueEmi && !currentMonthEmi ? loan.emis?.find(emi => {
                          const emiDate = new Date(emi.dueDate)
                          return !emi.isPaid && emiDate > currentMonthEnd
                        }) : null

                        const displayEmi = overdueEmi || currentMonthEmi || upcomingEmi
                        const isOverdue = !!overdueEmi
                        const isCurrentMonth = !!currentMonthEmi
                        const isPaid = displayEmi?.isPaid || false
                        const dueDate = displayEmi ? format(new Date(displayEmi.dueDate), "dd/MM/yy") : ""

                        // Color scheme: red for overdue, green for paid, orange for current month unpaid, blue for upcoming
                        const bgColor = isOverdue
                          ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                          : isPaid
                            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                            : isCurrentMonth
                              ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                              : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'

                        const textColor = isOverdue
                          ? 'text-red-700 dark:text-red-300'
                          : isPaid
                            ? 'text-green-700 dark:text-green-300'
                            : isCurrentMonth
                              ? 'text-orange-700 dark:text-orange-300'
                              : 'text-blue-700 dark:text-blue-300'

                        const dateColor = isOverdue
                          ? 'text-red-600 dark:text-red-400'
                          : isPaid
                            ? 'text-green-600 dark:text-green-400'
                            : isCurrentMonth
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-blue-600 dark:text-blue-400'

                        return (
                          <div className={`px-3 py-1.5 rounded-full ${bgColor} border`}>
                            <div className="flex items-center gap-2">
                              <p className={`text-xs font-semibold ${textColor}`}>
                                EMI: ₹{loan.emiAmount.toLocaleString()}
                              </p>
                              {displayEmi && (
                                <span className={`text-xs ${dateColor}`}>
                                  • {dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                      <div className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                          Outstanding: ₹{loan.currentOutstanding.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Mobile Info Pills */}
                  <div className="flex md:hidden items-center gap-2 mt-2 flex-wrap">
                    {(() => {
                      const now = new Date()
                      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

                      // First priority: Check for overdue unpaid EMIs
                      const overdueEmi = loan.emis?.find(emi => {
                        const emiDate = new Date(emi.dueDate)
                        return !emi.isPaid && emiDate < currentMonthStart
                      })

                      // Second priority: Check for current month EMI
                      const currentMonthEmi = !overdueEmi ? loan.emis?.find(emi => {
                        const emiDate = new Date(emi.dueDate)
                        return emiDate >= currentMonthStart && emiDate <= currentMonthEnd
                      }) : null

                      // Third priority: Get the next upcoming unpaid EMI
                      const upcomingEmi = !overdueEmi && !currentMonthEmi ? loan.emis?.find(emi => {
                        const emiDate = new Date(emi.dueDate)
                        return !emi.isPaid && emiDate > currentMonthEnd
                      }) : null

                      const displayEmi = overdueEmi || currentMonthEmi || upcomingEmi
                      const isOverdue = !!overdueEmi
                      const isCurrentMonth = !!currentMonthEmi
                      const isPaid = displayEmi?.isPaid || false
                      const dueDate = displayEmi ? format(new Date(displayEmi.dueDate), "dd/MM/yy") : ""

                      // Color scheme: red for overdue, green for paid, orange for current month unpaid, blue for upcoming
                      const bgColor = isOverdue
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                        : isPaid
                          ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                          : isCurrentMonth
                            ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                            : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'

                      const textColor = isOverdue
                        ? 'text-red-700 dark:text-red-300'
                        : isPaid
                          ? 'text-green-700 dark:text-green-300'
                          : isCurrentMonth
                            ? 'text-orange-700 dark:text-orange-300'
                            : 'text-blue-700 dark:text-blue-300'

                      const dateColor = isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : isPaid
                          ? 'text-green-600 dark:text-green-400'
                          : isCurrentMonth
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-blue-600 dark:text-blue-400'

                      return (
                        <div className={`px-2.5 py-1 rounded-full ${bgColor} border`}>
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-semibold ${textColor}`}>
                              EMI: ₹{loan.emiAmount.toLocaleString()}
                            </p>
                            {displayEmi && (
                              <span className={`text-xs ${dateColor}`}>
                                • {dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                        Outstanding: ₹{loan.currentOutstanding.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats - Only show when collapsed */}
                  {!isExpanded && (
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Principal</p>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">
                          ₹{(loan.principalAmount / 100000).toFixed(1)}L
                        </p>
                      </div>
                      <div className="text-center border-x border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rate</p>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">
                          {loan.interestRate}%
                        </p>
                      </div>
                      <div className="text-center border-r border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tenure</p>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">
                          {loan.tenure}m
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                          {loan.remainingTenure || 0}m
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-b from-gray-50/80 to-white/80 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm">
                    <div className="p-3 sm:p-4 space-y-4">
                      {/* Full Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Principal</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            ₹{loan.principalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Tenure</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {loan.tenure} months
                          </p>
                        </div>
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                            {loan.remainingTenure || 0} months
                          </p>
                        </div>
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Frequency</p>
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {getFrequencyLabel(loan.emiFrequency)}
                          </p>
                        </div>
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            ₹{loan.totalPaid.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-2 pt-1">
                        {!loan.isClosed && loan.isActive && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCloseLoanModal({
                                open: true,
                                loanId: loan.id,
                                currentOutstanding: loan.currentOutstanding,
                              })
                            }}
                            className="w-full sm:flex-1 justify-center text-xs h-9 bg-green-600/90 hover:bg-green-700/90 dark:bg-green-600/80 dark:hover:bg-green-700/80 backdrop-blur-sm"
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                            Close
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDeleteClick(loan, e)}
                          disabled={deletingId === loan.id}
                          className="w-full sm:flex-1 justify-center text-xs h-9 text-red-600 hover:text-red-700 hover:bg-red-50/80 dark:text-red-400 dark:hover:bg-red-900/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-red-200/50 dark:border-red-700/50"
                        >
                          {deletingId === loan.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditLoan(loan.id)
                          }}
                          className="w-full sm:flex-1 justify-center text-xs h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 dark:text-blue-400 dark:hover:bg-blue-900/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-blue-200/50 dark:border-blue-700/50"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/loans/${loan.id}`)
                          }}
                          className="w-full sm:flex-1 justify-center text-xs h-9 text-purple-600 hover:text-purple-700 hover:bg-purple-50/80 dark:text-purple-400 dark:hover:bg-purple-900/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                      </div>

                      {/* Current & Upcoming EMIs */}
                      {currentAndUpcomingEmis.length > 0 && !loan.isClosed && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            Current & Upcoming EMIs
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-2">
                            {currentAndUpcomingEmis.map((emi) => {
                              const now = new Date()
                              const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                              const emiDate = new Date(emi.dueDate)
                              const isOverdue = !emi.isPaid && emiDate < currentMonthStart

                              return (
                                <div
                                  key={emi.id}
                                  className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border backdrop-blur-sm ${
                                    emi.isPaid
                                      ? 'bg-green-50/80 dark:bg-green-950/40 border-green-300/50 dark:border-green-700/50'
                                      : isOverdue
                                        ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300/50 dark:border-red-700/50'
                                        : 'bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50'
                                  }`}
                                >
                                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <IndianRupee className={`h-3.5 w-3.5 flex-shrink-0 ${
                                        emi.isPaid
                                          ? 'text-green-600 dark:text-green-400'
                                          : isOverdue
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-500'
                                      }`} />
                                      <span className={`text-xs font-semibold ${
                                        emi.isPaid
                                          ? 'text-green-700 dark:text-green-300'
                                          : isOverdue
                                            ? 'text-red-700 dark:text-red-300'
                                            : 'text-gray-900 dark:text-white'
                                      }`}>
                                        ₹{emi.emiAmount.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className={`h-3.5 w-3.5 flex-shrink-0 ${
                                        emi.isPaid
                                          ? 'text-green-600 dark:text-green-400'
                                          : isOverdue
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-500'
                                      }`} />
                                      <span className={`text-xs font-medium ${
                                        emi.isPaid
                                          ? 'text-green-700 dark:text-green-300'
                                          : isOverdue
                                            ? 'text-red-700 dark:text-red-300'
                                            : 'text-gray-600 dark:text-gray-400'
                                      }`}>
                                        {format(new Date(emi.dueDate), "MMM dd, yyyy")}
                                      </span>
                                    </div>
                                  </div>
                                  {emi.isPaid ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100/80 dark:bg-green-900/50 rounded-full border border-green-300/50 dark:border-green-700/50 backdrop-blur-sm flex-shrink-0">
                                      <CheckCircle className="h-3 w-3 text-green-700 dark:text-green-300" />
                                      <span className="text-xs font-semibold text-green-700 dark:text-green-300 whitespace-nowrap">
                                        PAID
                                      </span>
                                    </div>
                                  ) : isOverdue ? (
                                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100/80 dark:bg-red-900/50 rounded-full border border-red-300/50 dark:border-red-700/50 backdrop-blur-sm">
                                        <span className="text-xs font-semibold text-red-700 dark:text-red-300 whitespace-nowrap">
                                          OVERDUE
                                        </span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 px-3 bg-red-50/80 hover:bg-red-100/80 dark:bg-red-900/30 dark:hover:bg-red-900/50 border-red-200/50 dark:border-red-700/50 backdrop-blur-sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setPayEmiModal({
                                            open: true,
                                            loanId: loan.id,
                                            emiId: emi.id,
                                            emiAmount: emi.emiAmount,
                                            dueDate: new Date(emi.dueDate),
                                          })
                                        }}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Pay
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-8 px-3 bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPayEmiModal({
                                          open: true,
                                          loanId: loan.id,
                                          emiId: emi.id,
                                          emiAmount: emi.emiAmount,
                                          dueDate: new Date(emi.dueDate),
                                        })
                                      }}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Loan Modal */}
      <AddLoanModal
        open={addLoanModalOpen}
        onOpenChange={setAddLoanModalOpen}
        onSuccess={fetchLoans}
      />

      {/* Edit Loan Modal */}
      {editingLoan && (
        <AddLoanModal
          open={!!editingLoan}
          onOpenChange={(open) => !open && setEditingLoan(null)}
          onSuccess={() => {
            fetchLoans()
            setEditingLoan(null)
          }}
          loan={{
            id: editingLoan.id,
            loanType: editingLoan.loanType,
            institution: editingLoan.institution,
            accountHolderName: editingLoan.accountHolderName,
            principalAmount: editingLoan.principalAmount,
            interestRate: editingLoan.interestRate,
            tenure: editingLoan.tenure,
            emiAmount: editingLoan.emiAmount,
            emiFrequency: editingLoan.emiFrequency,
            startDate: editingLoan.startDate,
            accountNumber: editingLoan.accountNumber,
            description: editingLoan.description,
            goldItems: editingLoan.goldItems,
            paymentSchedule: editingLoan.paymentSchedule,
            emis: editingLoan.emis?.map(emi => ({
              id: emi.id,
              installmentNumber: emi.installmentNumber,
              isPaid: emi.isPaid,
              paidAmount: emi.paidAmount,
            })),
          }}
        />
      )}

      {/* Pay EMI Modal */}
      {payEmiModal && (
        <PayEmiModal
          open={payEmiModal.open}
          onOpenChange={(open) => !open && setPayEmiModal(null)}
          loanId={payEmiModal.loanId}
          emiId={payEmiModal.emiId}
          emiAmount={payEmiModal.emiAmount}
          dueDate={payEmiModal.dueDate}
          onSuccess={() => {
            fetchLoans()
            setPayEmiModal(null)
          }}
        />
      )}

      {/* Close Loan Modal */}
      {closeLoanModal && (
        <CloseLoanModal
          open={closeLoanModal.open}
          onOpenChange={(open) => !open && setCloseLoanModal(null)}
          loanId={closeLoanModal.loanId}
          currentOutstanding={closeLoanModal.currentOutstanding}
          onSuccess={() => {
            fetchLoans()
            setCloseLoanModal(null)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation?.open || false}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the{" "}
              <span className="font-semibold">{deleteConfirmation?.loanType}</span> from{" "}
              <span className="font-semibold">{deleteConfirmation?.institution}</span>?
              <br /><br />
              This will permanently delete the loan and all associated EMI records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === deleteConfirmation?.loanId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingId === deleteConfirmation?.loanId}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletingId === deleteConfirmation?.loanId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Loan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
