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
import { Loader2, IndianRupee } from "lucide-react"
import { PAYMENT_METHODS } from "@/constants"

const paymentSchema = z.object({
  paidAmount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  paidDate: z.string().min(1, "Payment date is required"),
  principalPaid: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "Principal paid must be a positive number"
  ),
  interestPaid: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "Interest paid must be a positive number"
  ),
  lateFee: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "Late fee must be a positive number"
  ),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "OTHER"]),
  paymentNotes: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PayEmiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loanId: string
  emiId: string
  emiAmount: number
  dueDate: Date
  onSuccess?: () => void
}

export function PayEmiModal({
  open,
  onOpenChange,
  loanId,
  emiId,
  emiAmount,
  dueDate,
  onSuccess,
}: PayEmiModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paidAmount: emiAmount.toString(),
      paidDate: new Date().toISOString().split("T")[0],
      paymentMethod: undefined,
    },
  })

  const paymentMethod = watch("paymentMethod")

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setIsSubmitting(true)

      const payload = {
        paidAmount: Number(data.paidAmount),
        paidDate: data.paidDate,
        principalPaid: data.principalPaid ? Number(data.principalPaid) : undefined,
        interestPaid: data.interestPaid ? Number(data.interestPaid) : undefined,
        lateFee: data.lateFee ? Number(data.lateFee) : undefined,
        paymentMethod: data.paymentMethod,
        paymentNotes: data.paymentNotes,
      }

      console.log("Submitting payment:", payload)

      const response = await fetch(`/api/loans/${loanId}/emis/${emiId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      console.log("Payment response:", result)

      if (!response.ok) {
        throw new Error(result.error || "Failed to record payment")
      }

      toast.success(result.message || "Payment recorded successfully!")
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error recording payment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to record payment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none rounded-lg"></div>
        <div className="relative">
        <DialogHeader>
          <DialogTitle>Record EMI Payment</DialogTitle>
          <DialogDescription>
            Record payment for EMI due on {new Date(dueDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paidAmount">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              placeholder={emiAmount.toString()}
              {...register("paidAmount")}
            />
            {errors.paidAmount && (
              <p className="text-sm text-red-500">{errors.paidAmount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              EMI Amount: ₹{emiAmount.toLocaleString()}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="principalPaid">Principal Paid (₹)</Label>
              <Input
                id="principalPaid"
                type="number"
                step="0.01"
                placeholder="Optional"
                {...register("principalPaid")}
              />
              {errors.principalPaid && (
                <p className="text-sm text-red-500">{errors.principalPaid.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestPaid">Interest Paid (₹)</Label>
              <Input
                id="interestPaid"
                type="number"
                step="0.01"
                placeholder="Optional"
                {...register("interestPaid")}
              />
              {errors.interestPaid && (
                <p className="text-sm text-red-500">{errors.interestPaid.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lateFee">Late Fee (₹)</Label>
            <Input
              id="lateFee"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("lateFee")}
            />
            {errors.lateFee && (
              <p className="text-sm text-red-500">{errors.lateFee.message}</p>
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
              placeholder="Any additional notes about this payment"
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
                  Recording...
                </>
              ) : (
                <>
                  <IndianRupee className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
