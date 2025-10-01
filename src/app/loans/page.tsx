"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Calendar, Building2, IndianRupee, Loader2 } from "lucide-react"
import { format } from "date-fns"

interface EMI {
  id: string
  emiAmount: number
  dueDate: string
  isPaid: boolean
}

interface Loan {
  id: string
  loanType: string
  institution: string
  principalAmount: number
  emiAmount: number
  currentOutstanding: number
  isActive: boolean
  startDate: string
  tenure: number
  interestRate: number
  emis: EMI[]
}

export default function LoansPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/loans")

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this loan? This action cannot be undone.")) {
      return
    }

    try {
      setDeletingId(id)
      const response = await fetch(`/api/loans/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete loan")
      }

      toast.success("Loan deleted successfully")
      fetchLoans()
    } catch (error) {
      console.error("Error deleting loan:", error)
      toast.error("Failed to delete loan")
    } finally {
      setDeletingId(null)
    }
  }

  const getLoanTypeLabel = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ")
  }

  const getUpcomingEMIs = (emis: EMI[]) => {
    return emis.filter(emi => !emi.isPaid).slice(0, 3)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Loans</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your loans and track EMI payments
          </p>
        </div>
        <Button onClick={() => router.push("/loans/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Loan
        </Button>
      </div>

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
            <Button onClick={() => router.push("/loans/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => (
            <Card key={loan.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">
                        {getLoanTypeLabel(loan.loanType)}
                      </CardTitle>
                      <Badge variant={loan.isActive ? "default" : "secondary"}>
                        {loan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {loan.institution}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/loans/${loan.id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(loan.id)}
                      disabled={deletingId === loan.id}
                    >
                      {deletingId === loan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Principal Amount
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₹{loan.principalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      EMI Amount
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₹{loan.emiAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Outstanding
                    </p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      ₹{loan.currentOutstanding.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Interest Rate
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {loan.interestRate}%
                    </p>
                  </div>
                </div>

                {loan.emis && loan.emis.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Upcoming EMIs
                    </h4>
                    <div className="space-y-2">
                      {getUpcomingEMIs(loan.emis).map((emi) => (
                        <div
                          key={emi.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <IndianRupee className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              ₹{emi.emiAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(emi.dueDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600 dark:text-gray-400">
                        Tenure: <span className="font-medium text-gray-900 dark:text-white">{loan.tenure} months</span>
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Started: <span className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(loan.startDate), "MMM dd, yyyy")}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}