"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PAYMENT_METHODS } from "@/constants"

const closeSchema = z.object({
  paidAmount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  paidDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  paymentNotes: z.string().optional(),
})

type CloseFormData = z.infer<typeof closeSchema>

interface CloseLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loanId: string
  currentOutstanding: number
  onSuccess?: () => void
}

export function CloseLoanModal({
  open,
  onOpenChange,
  loanId,
  currentOutstanding,
  onSuccess,
}: CloseLoanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CloseFormData>({
    resolver: zodResolver(closeSchema),
    defaultValues: {
      paidAmount: currentOutstanding.toString(),
      paidDate: new Date().toISOString().split("T")[0],
      paymentMethod: undefined,
    },
  })

  const paymentMethod = watch("paymentMethod")

  const onSubmit = async (data: CloseFormData) => {
    try {
      setIsSubmitting(true)

      const payload = {
        paidAmount: Number(data.paidAmount),
        paidDate: data.paidDate,
        paymentMethod: data.paymentMethod,
        paymentNotes: data.paymentNotes,
      }

      const response = await fetch(`/api/loans/${loanId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to close loan")
      }

      const result = await response.json()
      toast.success(result.message || "Loan closed successfully!")
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error closing loan:", error)
      toast.error(error instanceof Error ? error.message : "Failed to close loan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Close Loan Early</DialogTitle>
          <DialogDescription>
            Pay off the remaining loan balance and close the loan
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Important</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This action will mark all pending EMIs as paid and close the loan permanently.
            This cannot be undone.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paidAmount">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              placeholder={currentOutstanding.toString()}
              {...register("paidAmount")}
            />
            {errors.paidAmount && (
              <p className="text-sm text-red-500">{errors.paidAmount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Outstanding Amount: ₹{currentOutstanding.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidDate">
              Payment Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paidDate"
              type="date"
              {...register("paidDate")}
            />
            {errors.paidDate && (
              <p className="text-sm text-red-500">{errors.paidDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setValue("paymentMethod", value as "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER", { shouldValidate: true })}
            >
              <SelectTrigger className={errors.paymentMethod ? "border-red-500" : ""}>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-red-500">
                {errors.paymentMethod.message || "Please select a payment method"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Notes (Optional)</Label>
            <Textarea
              id="paymentNotes"
              placeholder="Any additional notes about this closure"
              rows={3}
              {...register("paymentNotes")}
            />
            {errors.paymentNotes && (
              <p className="text-sm text-red-500">{errors.paymentNotes.message}</p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing Loan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Close Loan
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
