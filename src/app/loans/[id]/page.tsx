"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loan not found</p>
            <Button className="mt-4" onClick={() => router.push("/loans")}>
              Back to Loans
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentMonthEmi = getCurrentMonthEmi(loan.emis)
  const otherUnpaidEmis = getOtherUnpaidEmis(loan.emis, currentMonthEmi?.id)
  const paidEmis = getPaidEmis(loan.emis)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/loans")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Loans
          </Button>
        </div>
        {!loan.isClosed && loan.isActive && (
          <Button
            onClick={() => setCloseLoanModal({
              open: true,
              loanId: loan.id,
              currentOutstanding: loan.currentOutstanding,
            })}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Close Loan
          </Button>
        )}
      </div>

      {/* Loan Header */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-2xl">
                  {getLoanTypeLabel(loan.loanType)}
                </CardTitle>
                <Badge variant={loan.isActive ? "default" : "secondary"}>
                  {loan.isActive ? "Active" : "Inactive"}
                </Badge>
                {loan.isClosed && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300">
                    Closed
                  </Badge>
                )}
              </div>
              <CardDescription className="text-base">{loan.institution}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Principal Amount</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{loan.principalAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">EMI Amount</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{loan.emiAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Frequency</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {getFrequencyLabel(loan.emiFrequency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Outstanding</p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                ₹{loan.currentOutstanding.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Paid</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                ₹{loan.totalPaid.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Interest Rate</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {loan.interestRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tenure</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {loan.tenure} months
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start Date</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {format(new Date(loan.startDate), "MMM dd, yyyy")}
              </p>
            </div>
            {loan.isClosed && loan.closedAt && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Closed On</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {format(new Date(loan.closedAt), "MMM dd, yyyy")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Month EMI */}
      {currentMonthEmi && !loan.isClosed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Current Month EMI
            </CardTitle>
            <CardDescription>
              EMI for {format(new Date(currentMonthEmi.dueDate), "MMMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`flex flex-col gap-3 p-4 rounded-lg border sm:flex-row sm:items-center sm:justify-between transition-all ${
                currentMonthEmi.isPaid
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 flex-1">
                <div className="flex items-center gap-3">
                  {currentMonthEmi.isPaid && (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-3">
                    <IndianRupee className={`h-5 w-5 ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
                    <div>
                      <p className={`text-lg font-bold ${currentMonthEmi.isPaid ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                        ₹{currentMonthEmi.emiAmount.toLocaleString()}
                      </p>
                      <p className={`text-xs ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        EMI Amount
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className={`h-5 w-5 ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
                  <div>
                    <p className={`font-semibold ${currentMonthEmi.isPaid ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                      {format(new Date(currentMonthEmi.dueDate), "MMM dd, yyyy")}
                    </p>
                    <p className={`text-xs ${currentMonthEmi.isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Due Date
                    </p>
                  </div>
                </div>
              </div>
              {currentMonthEmi.isPaid ? (
                <div className="flex items-center gap-2 px-5 py-3 bg-green-100 dark:bg-green-900/40 rounded-lg border-2 border-green-400 dark:border-green-600">
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
                  className="w-full sm:w-auto"
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
          </CardContent>
        </Card>
      )}

      {/* Other Unpaid EMIs */}
      {otherUnpaidEmis.length > 0 && !loan.isClosed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Upcoming Payments ({otherUnpaidEmis.length})
            </CardTitle>
            <CardDescription>
              Future EMIs that are yet to be paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherUnpaidEmis.map((emi) => (
                <div
                  key={emi.id}
                  className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 flex-1">
                    <div className="flex items-center gap-3">
                      <IndianRupee className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ₹{emi.emiAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">EMI Amount</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(emi.dueDate), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
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
          </CardContent>
        </Card>
      )}

      {/* Paid EMIs */}
      {paidEmis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Payment History ({paidEmis.length})
            </CardTitle>
            <CardDescription>
              EMIs that have been successfully paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paidEmis.map((emi) => (
                <div
                  key={emi.id}
                  className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Payment Details
                    </h4>
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
                        className="h-8 px-2"
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
                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">EMI Amount</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ₹{emi.emiAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paid Amount</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        ₹{(emi.paidAmount || emi.emiAmount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {format(new Date(emi.dueDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paid Date</p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {emi.paidDate ? format(new Date(emi.paidDate), "MMM dd, yyyy") : "-"}
                      </p>
                    </div>
                    {(emi.principalPaid || emi.interestPaid || emi.lateFee) && (
                      <>
                        {emi.principalPaid && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Principal</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              ₹{emi.principalPaid.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {emi.interestPaid && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interest</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              ₹{emi.interestPaid.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {emi.lateFee && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Late Fee</p>
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                              ₹{emi.lateFee.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {emi.paymentMethod && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Method</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {emi.paymentMethod.replace("_", " ")}
                        </p>
                      </div>
                    )}
                  </div>
                  {emi.paymentNotes && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{emi.paymentNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
