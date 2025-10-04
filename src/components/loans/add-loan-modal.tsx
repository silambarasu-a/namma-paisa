"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, X, Check } from "lucide-react"
import { LOAN_TYPES, EMI_FREQUENCIES } from "@/constants"
import { INDIAN_BANKS } from "@/constants/banks"
import type { PaymentScheduleDate } from "@/types/finance"

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
  ], { message: "Please select a loan type" }),
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
  emiFrequency: z.enum([
    "MONTHLY",
    "QUARTERLY",
    "HALF_YEARLY",
    "ANNUALLY",
    "CUSTOM",
  ], { message: "Please select payment frequency" }),
  startDate: z.string().min(1, "Start date is required"),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
})

type LoanFormData = z.infer<typeof loanFormSchema>

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

interface AddLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddLoanModal({ open, onOpenChange, onSuccess }: AddLoanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleDate[]>([])
  const [institutionInput, setInstitutionInput] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      emiFrequency: "MONTHLY",
    },
  })

  const loanType = watch("loanType")
  const principalAmount = watch("principalAmount")
  const interestRate = watch("interestRate")
  const tenure = watch("tenure")
  const emiAmount = watch("emiAmount")
  const emiFrequency = watch("emiFrequency")

  // Filter banks based on input
  const filteredBanks = useMemo(() => {
    if (!institutionInput) return INDIAN_BANKS.slice(0, 20)

    const searchLower = institutionInput.toLowerCase()
    const filtered = INDIAN_BANKS.filter((bank) =>
      bank.toLowerCase().includes(searchLower)
    )

    if (filtered.length === 0 && institutionInput.trim()) {
      return ["Other"]
    }

    return filtered
  }, [institutionInput])

  const handleInstitutionSelect = (bank: string) => {
    if (bank === "Other") {
      setValue("institution", institutionInput)
    } else {
      setInstitutionInput(bank)
      setValue("institution", bank)
    }
    setShowDropdown(false)
  }

  const getTenureLabel = () => {
    switch (emiFrequency) {
      case "MONTHLY":
        return "Tenure (months)"
      case "QUARTERLY":
        return "Tenure (quarters)"
      case "HALF_YEARLY":
        return "Tenure (half-years)"
      case "ANNUALLY":
        return "Tenure (years)"
      case "CUSTOM":
        return "Tenure (payments)"
      default:
        return "Tenure (months)"
    }
  }

  const initializePaymentSchedule = (frequency: string) => {
    const startDate = watch("startDate")
    const baseDay = startDate ? new Date(startDate).getDate() : 1

    switch (frequency) {
      case "QUARTERLY":
        setPaymentSchedule([
          { month: 1, day: baseDay },
          { month: 4, day: baseDay },
          { month: 7, day: baseDay },
          { month: 10, day: baseDay },
        ])
        break
      case "HALF_YEARLY":
        setPaymentSchedule([
          { month: 1, day: baseDay },
          { month: 7, day: baseDay },
        ])
        break
      case "ANNUALLY":
        setPaymentSchedule([
          { month: 1, day: baseDay },
        ])
        break
      case "CUSTOM":
        setPaymentSchedule([
          { month: 1, day: baseDay },
        ])
        break
      default:
        setPaymentSchedule([])
    }
  }

  const convertTenureToMonths = (tenureValue: number, frequency: string): number => {
    switch (frequency) {
      case "MONTHLY":
        return tenureValue
      case "QUARTERLY":
        return tenureValue * 3
      case "HALF_YEARLY":
        return tenureValue * 6
      case "ANNUALLY":
        return tenureValue * 12
      case "CUSTOM":
        return tenureValue
      default:
        return tenureValue
    }
  }

  const convertMonthsToTenure = (months: number, frequency: string): number => {
    switch (frequency) {
      case "MONTHLY":
        return months
      case "QUARTERLY":
        return Math.ceil(months / 3)
      case "HALF_YEARLY":
        return Math.ceil(months / 6)
      case "ANNUALLY":
        return Math.ceil(months / 12)
      case "CUSTOM":
        return months
      default:
        return months
    }
  }

  const calculateEMI = (principal: number, rate: number, tenureInMonths: number): number => {
    if (rate === 0) {
      return principal / tenureInMonths
    }
    const monthlyRate = rate / 12 / 100
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureInMonths)) / (Math.pow(1 + monthlyRate, tenureInMonths) - 1)
    return Math.round(emi * 100) / 100
  }

  const calculateTenure = (principal: number, rate: number, emi: number): number => {
    if (rate === 0) {
      return Math.ceil(principal / emi)
    }
    const monthlyRate = rate / 12 / 100
    const tenureInMonths = Math.log(emi / (emi - principal * monthlyRate)) / Math.log(1 + monthlyRate)
    return Math.ceil(tenureInMonths)
  }

  const handleFieldChange = (field: string, value: string) => {
    const principal = field === "principalAmount" ? Number(value) : Number(principalAmount)
    const rate = field === "interestRate" ? Number(value) : Number(interestRate)
    const tenureValue = field === "tenure" ? Number(value) : Number(tenure)
    const emi = field === "emiAmount" ? Number(value) : Number(emiAmount)
    const frequency = emiFrequency || "MONTHLY"

    if (principal > 0 && rate >= 0) {
      if (field !== "emiAmount" && tenureValue > 0 && (!emi || emi === 0)) {
        const monthsForCalculation = convertTenureToMonths(tenureValue, frequency)
        const calculatedEMI = calculateEMI(principal, rate, monthsForCalculation)
        setValue("emiAmount", calculatedEMI.toString())
      } else if (field !== "tenure" && emi > 0 && (!tenureValue || tenureValue === 0)) {
        const calculatedMonths = calculateTenure(principal, rate, emi)
        const tenureInFrequencyUnits = convertMonthsToTenure(calculatedMonths, frequency)
        setValue("tenure", tenureInFrequencyUnits.toString())
      }
    }
  }

  const handleFrequencyChange = (frequency: string) => {
    const oldFrequency = emiFrequency || "MONTHLY"
    setValue("emiFrequency", frequency as "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY" | "CUSTOM")
    initializePaymentSchedule(frequency)

    if (tenure && Number(tenure) > 0) {
      const monthsEquivalent = convertTenureToMonths(Number(tenure), oldFrequency)
      const newTenure = convertMonthsToTenure(monthsEquivalent, frequency)
      setValue("tenure", newTenure.toString())
    }

    if (principalAmount && interestRate && tenure && Number(tenure) > 0 && emiAmount) {
      handleFieldChange("tenure", tenure)
    }
  }

  const updatePaymentScheduleDate = (index: number, field: "month" | "day", value: number) => {
    const updated = [...paymentSchedule]
    updated[index] = { ...updated[index], [field]: value }
    setPaymentSchedule(updated)
  }

  const addCustomDate = () => {
    setPaymentSchedule([...paymentSchedule, { month: 1, day: 1 }])
  }

  const removeCustomDate = (index: number) => {
    setPaymentSchedule(paymentSchedule.filter((_, i) => i !== index))
  }

  const validatePaymentSchedule = (): string | null => {
    if (emiFrequency === "MONTHLY") return null

    if (paymentSchedule.length === 0) {
      return "Please configure payment schedule dates"
    }

    for (const date of paymentSchedule) {
      if (date.day < 1 || date.day > 31) {
        return "Day must be between 1 and 31"
      }
    }

    const requiredCount = {
      QUARTERLY: 4,
      HALF_YEARLY: 2,
      ANNUALLY: 1,
      CUSTOM: 1,
    }

    if (emiFrequency !== "CUSTOM" && paymentSchedule.length !== requiredCount[emiFrequency as keyof typeof requiredCount]) {
      return `${emiFrequency.replace("_", " ")} requires ${requiredCount[emiFrequency as keyof typeof requiredCount]} payment date(s)`
    }

    return null
  }

  const onSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true)

      const scheduleError = validatePaymentSchedule()
      if (scheduleError) {
        toast.error(scheduleError)
        return
      }

      const payload = {
        loanType: data.loanType,
        institution: data.institution,
        principalAmount: Number(data.principalAmount),
        interestRate: Number(data.interestRate),
        tenure: Number(data.tenure),
        emiAmount: Number(data.emiAmount),
        emiFrequency: data.emiFrequency,
        paymentSchedule: data.emiFrequency !== "MONTHLY" ? { dates: paymentSchedule } : undefined,
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
      reset()
      setInstitutionInput("")
      setPaymentSchedule([])
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error creating loan:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create loan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPaymentScheduleInputs = () => {
    if (emiFrequency === "MONTHLY" || !emiFrequency) {
      return null
    }

    return (
      <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            Payment Schedule <span className="text-red-500">*</span>
          </Label>
          {emiFrequency === "CUSTOM" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addCustomDate}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Date
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {paymentSchedule.map((date, index) => (
            <div key={index} className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`month-${index}`} className="text-xs">
                  Month {emiFrequency !== "CUSTOM" ? index + 1 : ""}
                </Label>
                <Select
                  value={date.month.toString()}
                  onValueChange={(value) => updatePaymentScheduleDate(index, "month", Number(value))}
                >
                  <SelectTrigger id={`month-${index}`}>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`day-${index}`} className="text-xs flex items-center justify-between">
                  <span>Day</span>
                  {emiFrequency === "CUSTOM" && paymentSchedule.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCustomDate(index)}
                      className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Label>
                <Input
                  id={`day-${index}`}
                  type="number"
                  min="1"
                  max="31"
                  value={date.day}
                  onChange={(e) => updatePaymentScheduleDate(index, "day", Number(e.target.value))}
                  placeholder="1-31"
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {emiFrequency === "QUARTERLY" && "Specify the 4 months and days for quarterly payments"}
          {emiFrequency === "HALF_YEARLY" && "Specify the 2 months and days for half-yearly payments"}
          {emiFrequency === "ANNUALLY" && "Specify the month and day for annual payment"}
          {emiFrequency === "CUSTOM" && "Add multiple payment dates throughout the year"}
        </p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] overflow-y-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white">Add New Loan</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm xl:text-base">
            Fill in all the required details about your loan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="space-y-2 w-full md:w-auto">
              <Label htmlFor="loanType">
                Loan Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={loanType}
                onValueChange={(value) => setValue("loanType", value as LoanFormData["loanType"])}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((type) => (
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

            <div className="space-y-2 w-full md:flex-1 relative">
              <Label htmlFor="institution">
                Institution Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="institution"
                  placeholder="Type to search or enter bank name..."
                  value={institutionInput}
                  onChange={(e) => {
                    setInstitutionInput(e.target.value)
                    setValue("institution", e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowDropdown(false), 200)
                  }}
                  autoComplete="off"
                />
                {showDropdown && filteredBanks.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    {filteredBanks.map((bank) => (
                      <div
                        key={bank}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm flex items-center gap-2"
                        onClick={() => handleInstitutionSelect(bank)}
                      >
                        {bank === "Other" ? (
                          <>
                            <span className="text-muted-foreground">Other:</span>
                            <span className="font-medium">&quot;{institutionInput}&quot;</span>
                          </>
                        ) : (
                          <>
                            {institutionInput && bank.toLowerCase().includes(institutionInput.toLowerCase()) && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                            {bank}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.institution && (
                <p className="text-sm text-red-500">{errors.institution.message}</p>
              )}
            </div>
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
                onChange={(e) => {
                  setValue("principalAmount", e.target.value)
                  handleFieldChange("principalAmount", e.target.value)
                }}
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
                onChange={(e) => {
                  setValue("interestRate", e.target.value)
                  handleFieldChange("interestRate", e.target.value)
                }}
              />
              {errors.interestRate && (
                <p className="text-sm text-red-500">{errors.interestRate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emiFrequency">
                Payment Frequency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={emiFrequency}
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment frequency" />
                </SelectTrigger>
                <SelectContent>
                  {EMI_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.emiFrequency && (
                <p className="text-sm text-red-500">{errors.emiFrequency.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                How often you make payments
              </p>
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
                onChange={(e) => {
                  setValue("emiAmount", e.target.value)
                  handleFieldChange("emiAmount", e.target.value)
                }}
              />
              {errors.emiAmount && (
                <p className="text-sm text-red-500">{errors.emiAmount.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Auto-calculated if tenure is entered first
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenure">
                {getTenureLabel()} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tenure"
                type="number"
                placeholder={emiFrequency === "MONTHLY" ? "240" : emiFrequency === "QUARTERLY" ? "80" : emiFrequency === "HALF_YEARLY" ? "40" : emiFrequency === "ANNUALLY" ? "20" : "24"}
                {...register("tenure")}
                onChange={(e) => {
                  setValue("tenure", e.target.value)
                  handleFieldChange("tenure", e.target.value)
                }}
              />
              {errors.tenure && (
                <p className="text-sm text-red-500">{errors.tenure.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Auto-calculated if EMI is entered first
              </p>
            </div>
          </div>

          {renderPaymentScheduleInputs()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
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
                  Creating Loan...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Loan
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
