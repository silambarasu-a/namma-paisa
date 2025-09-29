"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Save } from "lucide-react"

const loanUpdateSchema = z.object({
  loanType: z.enum([
    "HOME_LOAN",
    "CAR_LOAN",
    "PERSONAL_LOAN",
    "EDUCATION_LOAN",
    "BUSINESS_LOAN",
    "GOLD_LOAN",
    "CREDIT_CARD",
    "OTHER",
  ], "Please select a loan type"),
  institution: z.string().min(1, "Institution name is required"),
  interestRate: z.string().min(1, "Interest rate is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
    "Interest rate must be between 0 and 100"
  ),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
})

type LoanUpdateFormData = z.infer<typeof loanUpdateSchema>

interface Loan {
  id: string
  loanType: string
  institution: string
  principalAmount: number
  interestRate: number
  tenure: number
  emiAmount: number
  startDate: string
  currentOutstanding: number
  accountNumber?: string
  description?: string
  isActive: boolean
}

const loanTypes = [
  { value: "HOME_LOAN", label: "Home Loan" },
  { value: "CAR_LOAN", label: "Car Loan" },
  { value: "PERSONAL_LOAN", label: "Personal Loan" },
  { value: "EDUCATION_LOAN", label: "Education Loan" },
  { value: "BUSINESS_LOAN", label: "Business Loan" },
  { value: "GOLD_LOAN", label: "Gold Loan" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "OTHER", label: "Other" },
]

export default function EditLoanPage() {
  const router = useRouter()
  const params = useParams()
  const loanId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loan, setLoan] = useState<Loan | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LoanUpdateFormData>({
    resolver: zodResolver(loanUpdateSchema),
  })

  const loanType = watch("loanType")
  const isActive = watch("isActive")

  useEffect(() => {
    fetchLoan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId])

  const fetchLoan = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/loans/${loanId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch loan")
      }

      const data = await response.json()
      setLoan(data)

      // Pre-fill form with existing data
      reset({
        loanType: data.loanType,
        institution: data.institution,
        interestRate: data.interestRate.toString(),
        accountNumber: data.accountNumber || "",
        description: data.description || "",
        isActive: data.isActive,
      })
    } catch (error) {
      console.error("Error fetching loan:", error)
      toast.error("Failed to load loan details")
      router.push("/loans")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: LoanUpdateFormData) => {
    try {
      setIsSubmitting(true)

      const payload = {
        loanType: data.loanType,
        institution: data.institution,
        interestRate: Number(data.interestRate),
        accountNumber: data.accountNumber || undefined,
        description: data.description || undefined,
        isActive: data.isActive,
      }

      const response = await fetch(`/api/loans/${loanId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update loan")
      }

      toast.success("Loan updated successfully!")
      router.push("/loans")
      router.refresh()
    } catch (error) {
      console.error("Error updating loan:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update loan")
    } finally {
      setIsSubmitting(false)
    }
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
      <div className="max-w-3xl mx-auto space-y-6">
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Loan</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Update the details of your loan
        </p>
      </div>

      {/* Read-only loan information */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">Loan Details (Read-Only)</CardTitle>
          <CardDescription>
            These details cannot be modified after loan creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Principal Amount</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{loan.principalAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">EMI Amount</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{loan.emiAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tenure</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {loan.tenure} months
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Start Date</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {new Date(loan.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Outstanding</p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                ₹{loan.currentOutstanding.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable form */}
      <Card>
        <CardHeader>
          <CardTitle>Editable Information</CardTitle>
          <CardDescription>
            Update the following loan details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="loanType">
                Loan Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={loanType}
                onValueChange={(value) => setValue("loanType", value as "HOME_LOAN" | "CAR_LOAN" | "PERSONAL_LOAN" | "EDUCATION_LOAN" | "BUSINESS_LOAN" | "GOLD_LOAN" | "CREDIT_CARD" | "OTHER")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  {loanTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.loanType && (
                <p className="text-sm text-red-500">{errors.loanType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">
                Institution Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="institution"
                placeholder="e.g., HDFC Bank, SBI, ICICI Bank"
                {...register("institution")}
              />
              {errors.institution && (
                <p className="text-sm text-red-500">{errors.institution.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">
                Interest Rate (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                placeholder="8.5"
                {...register("interestRate")}
              />
              {errors.interestRate && (
                <p className="text-sm text-red-500">{errors.interestRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number (Optional)</Label>
              <Input
                id="accountNumber"
                placeholder="Enter account number"
                {...register("accountNumber")}
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-500">{errors.accountNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Additional notes about this loan"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="isActive">Status</Label>
              <Select
                value={isActive ? "true" : "false"}
                onValueChange={(value) => setValue("isActive", value === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mark as inactive if the loan has been closed or transferred
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating Loan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Loan
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/loans")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}