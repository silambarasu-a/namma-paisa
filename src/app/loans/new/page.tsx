"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Plus } from "lucide-react"

const loanFormSchema = z.object({
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
  principalAmount: z.string().min(1, "Principal amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Principal amount must be a positive number"
  ),
  interestRate: z.string().min(1, "Interest rate is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
    "Interest rate must be between 0 and 100"
  ),
  tenure: z.string().min(1, "Tenure is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val)),
    "Tenure must be a positive whole number"
  ),
  emiAmount: z.string().min(1, "EMI amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "EMI amount must be a positive number"
  ),
  startDate: z.string().min(1, "Start date is required"),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
})

type LoanFormData = z.infer<typeof loanFormSchema>

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

export default function NewLoanPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
  })

  const loanType = watch("loanType")

  const onSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true)

      const payload = {
        loanType: data.loanType,
        institution: data.institution,
        principalAmount: Number(data.principalAmount),
        interestRate: Number(data.interestRate),
        tenure: Number(data.tenure),
        emiAmount: Number(data.emiAmount),
        startDate: data.startDate,
        accountNumber: data.accountNumber || undefined,
        description: data.description || undefined,
      }

      const response = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create loan")
      }

      toast.success("Loan created successfully!")
      router.push("/loans")
      router.refresh()
    } catch (error) {
      console.error("Error creating loan:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create loan")
    } finally {
      setIsSubmitting(false)
    }
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Loan</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Enter the details of your new loan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Information</CardTitle>
          <CardDescription>
            Fill in all the required details about your loan
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
                onValueChange={(value) => setValue("loanType", value as any)}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="principalAmount">
                  Principal Amount (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="principalAmount"
                  type="number"
                  step="0.01"
                  placeholder="500000"
                  {...register("principalAmount")}
                />
                {errors.principalAmount && (
                  <p className="text-sm text-red-500">{errors.principalAmount.message}</p>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tenure">
                  Tenure (months) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tenure"
                  type="number"
                  placeholder="240"
                  {...register("tenure")}
                />
                {errors.tenure && (
                  <p className="text-sm text-red-500">{errors.tenure.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emiAmount">
                  EMI Amount (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emiAmount"
                  type="number"
                  step="0.01"
                  placeholder="5000"
                  {...register("emiAmount")}
                />
                {errors.emiAmount && (
                  <p className="text-sm text-red-500">{errors.emiAmount.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate.message}</p>
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

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Loan...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Loan
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