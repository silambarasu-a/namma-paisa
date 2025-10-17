"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, ArrowLeft, IndianRupee, CheckCircle } from "lucide-react"

const returnFormSchema = z.object({
  returnAmount: z
    .string()
    .min(1, "Return amount is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Return amount must be a positive number"
    ),
  returnDate: z.string().min(1, "Return date is required"),
  notes: z.string().optional(),
})

type ReturnFormData = z.infer<typeof returnFormSchema>

interface ReturnFundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  fund: {
    id: string
    lenderName: string
    borrowedAmount: number
    returnedAmount: number
  }
}

export function ReturnFundModal({
  open,
  onOpenChange,
  onSuccess,
  fund,
}: ReturnFundModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const remainingBalance = fund.borrowedAmount - fund.returnedAmount

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ReturnFormData>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      returnDate: new Date().toISOString().split("T")[0],
      returnAmount: remainingBalance.toString(),
    },
  })

  const returnAmount = watch("returnAmount")
  const returnAmountNum = Number(returnAmount) || 0
  const isFullReturn = returnAmountNum >= remainingBalance
  const newBalance = remainingBalance - returnAmountNum

  const onSubmit = async (data: ReturnFormData) => {
    try {
      setIsLoading(true)

      const payload = {
        returnAmount: Number(data.returnAmount),
        returnDate: data.returnDate,
        notes: data.notes || undefined,
      }

      const response = await fetch(`/api/borrowed-funds/${fund.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to record return")
      }

      const result = await response.json()
      toast.success(result.message || "Return recorded successfully")
      onSuccess()
      onOpenChange(false)
      reset()
    } catch (error) {
      console.error("Error recording return:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to record return"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Return Borrowed Fund
          </DialogTitle>
          <DialogDescription className="text-sm">
            Record a payment to {fund.lenderName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Summary Card */}
          <div className="p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border border-border/50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lender</span>
              <span className="font-semibold">{fund.lenderName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Total Borrowed
              </span>
              <span className="font-semibold">
                ₹{fund.borrowedAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Already Returned
              </span>
              <span className="font-semibold text-green-500">
                ₹{fund.returnedAmount.toLocaleString()}
              </span>
            </div>
            <div className="pt-3 border-t border-border/50">
              <div className="flex justify-between items-center">
                <span className="font-medium">Outstanding Balance</span>
                <span className="text-xl font-bold text-orange-500">
                  ₹{remainingBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Return Amount */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="returnAmount">
                Return Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="returnAmount"
                  {...register("returnAmount")}
                  type="number"
                  step="0.01"
                  placeholder={remainingBalance.toString()}
                  className="pl-7 bg-background text-lg font-semibold"
                />
              </div>
              {errors.returnAmount && (
                <p className="text-sm text-destructive">
                  {errors.returnAmount.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    reset({
                      returnAmount: (remainingBalance * 0.25).toFixed(2),
                      returnDate: watch("returnDate"),
                      notes: watch("notes"),
                    })
                  }
                >
                  25%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    reset({
                      returnAmount: (remainingBalance * 0.5).toFixed(2),
                      returnDate: watch("returnDate"),
                      notes: watch("notes"),
                    })
                  }
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    reset({
                      returnAmount: (remainingBalance * 0.75).toFixed(2),
                      returnDate: watch("returnDate"),
                      notes: watch("notes"),
                    })
                  }
                >
                  75%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    reset({
                      returnAmount: remainingBalance.toString(),
                      returnDate: watch("returnDate"),
                      notes: watch("notes"),
                    })
                  }
                >
                  Full
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDate">
                Return Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="returnDate"
                {...register("returnDate")}
                type="date"
                className="bg-background"
              />
              {errors.returnDate && (
                <p className="text-sm text-destructive">
                  {errors.returnDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Add any notes about this return..."
                rows={3}
                className="bg-background resize-none"
              />
            </div>
          </div>

          {/* Preview */}
          {returnAmountNum > 0 && (
            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <div className="space-y-2">
                {isFullReturn ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Full Return - Fund will be marked as complete</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        New Balance After Return
                      </span>
                      <span className="font-bold text-lg">
                        ₹{newBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Progress
                      </span>
                      <span className="font-semibold">
                        {(
                          ((fund.returnedAmount + returnAmountNum) /
                            fund.borrowedAmount) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                reset()
              }}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || returnAmountNum <= 0}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <IndianRupee className="mr-2 h-4 w-4" />
                  Record Return
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
