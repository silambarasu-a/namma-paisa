"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, X, Check, ChevronRight, ChevronLeft, Info } from "lucide-react"
import { LOAN_TYPES, EMI_FREQUENCIES, type LoanType, type EMIFrequency } from "@/constants"
import { INDIAN_BANKS } from "@/constants/banks"
import type { PaymentScheduleDate } from "@/types/finance"
import { autoCalculateLoanField } from "@/lib/emi-calculator"

const loanFormSchema = z.object({
  loanType: z.enum(LOAN_TYPES.map(t => t.value) as [LoanType, ...LoanType[]], {
    message: "Please select a loan type"
  }),
  institution: z.string().min(1, "Institution name is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  principalAmount: z.string().min(1, "Principal amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Principal amount must be a positive number"
  ),
  interestRate: z.string().min(1, "Interest rate is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
    "Interest rate must be between 0 and 100"
  ),
  tenure: z.string().optional(),
  emiAmount: z.string().optional(),
  emiFrequency: z.enum(EMI_FREQUENCIES.map(f => f.value) as [EMIFrequency, ...EMIFrequency[]], {
    message: "Please select payment frequency"
  }),
  startDate: z.string().min(1, "Start date is required"),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
}).refine((data) => data.tenure || data.emiAmount, {
  message: "Either tenure or EMI amount must be provided",
  path: ["tenure"],
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
  loan?: {
    id: string
    loanType: LoanType
    institution: string
    accountHolderName: string
    principalAmount: number
    interestRate: number
    tenure: number
    emiAmount: number
    emiFrequency: EMIFrequency
    startDate: string
    accountNumber?: string | null
    description?: string | null
    goldItems?: Array<{
      id: string
      title: string
      carat: number
      quantity: number
      grossWeight: number
      netWeight: number
      loanAmount?: number | null
    }>
    paymentSchedule?: {
      dates: PaymentScheduleDate[]
    } | null
    emis?: Array<{
      id: string
      installmentNumber: number
      isPaid: boolean
      paidAmount?: number | null
    }>
  }
}

interface CustomEMI {
  installmentNumber: number
  amount: string
  dueDate: Date
  isPaid?: boolean
}

export function AddLoanModal({ open, onOpenChange, onSuccess, loan }: AddLoanModalProps) {
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleDate[]>([])
  const [institutionInput, setInstitutionInput] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [goldItems, setGoldItems] = useState<Array<{
    title: string
    carat: string
    quantity: string
    grossWeight: string
    netWeight: string
    loanAmount: string
  }>>([])
  const [calculatedTenure, setCalculatedTenure] = useState<number | null>(null)
  const [calculatedEMI, setCalculatedEMI] = useState<number | null>(null)
  const [customEMIs, setCustomEMIs] = useState<CustomEMI[]>([])
  const [emiSearchTerm, setEmiSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showMobileInfo, setShowMobileInfo] = useState(false)
  const itemsPerPage = 20

  // Auto-dismiss info panel after 10 seconds
  useEffect(() => {
    if (showMobileInfo) {
      const timer = setTimeout(() => {
        setShowMobileInfo(false)
      }, 10000) // 10 seconds

      return () => clearTimeout(timer)
    }
  }, [showMobileInfo])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger,
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
  const startDate = watch("startDate")

  const isGoldLoan = loanType === "GOLD_LOAN"

  // Reset modal state when closed
  useEffect(() => {
    if (!open) {
      setCurrentStep(1)
      setPaymentSchedule([])
      setInstitutionInput("")
      setShowDropdown(false)
      setGoldItems([])
      setCalculatedTenure(null)
      setCalculatedEMI(null)
      setCustomEMIs([])
      setShowMobileInfo(false)
      reset()
    }
  }, [open, reset])

  // Set default account holder name when modal opens OR populate form when editing
  useEffect(() => {
    if (open) {
      if (loan) {
        // Editing mode - populate form with loan data
        setValue("loanType", loan.loanType)
        setValue("institution", loan.institution)
        setInstitutionInput(loan.institution)
        setValue("accountHolderName", loan.accountHolderName)
        setValue("principalAmount", loan.principalAmount.toString())
        setValue("interestRate", loan.interestRate.toString())
        setValue("tenure", loan.tenure.toString())
        setValue("emiAmount", loan.emiAmount.toString())
        setValue("emiFrequency", loan.emiFrequency)
        // Format date to YYYY-MM-DD for HTML date input
        const dateObj = new Date(loan.startDate)
        const formattedDate = dateObj.toISOString().split('T')[0]
        setValue("startDate", formattedDate)
        setValue("accountNumber", loan.accountNumber || "")
        setValue("description", loan.description || "")

        // Populate gold items if available
        if (loan.goldItems && loan.goldItems.length > 0) {
          setGoldItems(loan.goldItems.map(item => ({
            title: item.title,
            carat: item.carat.toString(),
            quantity: item.quantity.toString(),
            grossWeight: item.grossWeight.toString(),
            netWeight: item.netWeight.toString(),
            loanAmount: item.loanAmount?.toString() || "",
          })))
        }

        // Populate payment schedule if available
        if (loan.paymentSchedule?.dates) {
          setPaymentSchedule(loan.paymentSchedule.dates)
        }
      } else if (session?.user?.name) {
        // Creating mode - set default account holder name
        setValue("accountHolderName", session.user.name)
      }
    }
  }, [open, loan, session, setValue])

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

  const initializePaymentSchedule = (frequency: string, customTenure?: number) => {
    const baseDay = startDate ? new Date(startDate).getDate() : 1
    const baseMonth = startDate ? new Date(startDate).getMonth() + 1 : 1

    switch (frequency) {
      case "QUARTERLY": {
        // Default quarterly schedule - all 4 quarters
        const allSchedules = [
          { month: 1, day: baseDay },
          { month: 4, day: baseDay },
          { month: 7, day: baseDay },
          { month: 10, day: baseDay },
        ]

        // Limit to tenure only if tenure < 4
        const limitedSchedules = customTenure && customTenure < 4
          ? allSchedules.slice(0, customTenure)
          : allSchedules
        setPaymentSchedule(limitedSchedules)
        break
      }
      case "HALF_YEARLY": {
        // Default half-yearly schedule - both half-years
        const allSchedules = [
          { month: 1, day: baseDay },
          { month: 7, day: baseDay },
        ]

        // Limit to tenure only if tenure < 2
        const limitedSchedules = customTenure && customTenure < 2
          ? allSchedules.slice(0, customTenure)
          : allSchedules
        setPaymentSchedule(limitedSchedules)
        break
      }
      case "ANNUALLY": {
        // For annual, use the actual month and day from start date
        setPaymentSchedule([
          { month: baseMonth, day: baseDay },
        ])
        break
      }
      case "CUSTOM": {
        // For custom frequency, create schedule dates based on tenure
        if (customTenure && customTenure > 0) {
          const schedules: PaymentScheduleDate[] = []
          const monthsPerPayment = Math.floor(12 / customTenure)
          for (let i = 0; i < customTenure; i++) {
            const month = ((i * monthsPerPayment) % 12) + 1
            schedules.push({ month, day: baseDay })
          }
          setPaymentSchedule(schedules)
        } else {
          setPaymentSchedule([
            { month: 1, day: baseDay },
          ])
        }
        break
      }
      default:
        setPaymentSchedule([])
    }
  }

  const handleFrequencyChange = (frequency: string) => {
    const freq = frequency as EMIFrequency
    setValue("emiFrequency", freq)

    // Get current or calculated tenure
    const currentTenure = Number(tenure) || calculatedTenure || 0

    // Initialize payment schedule with current tenure
    initializePaymentSchedule(frequency, currentTenure > 0 ? currentTenure : undefined)

    // Recalculate EMI or tenure when frequency changes
    if (principalAmount && interestRate) {
      if (tenure && Number(tenure) > 0) {
        const calculated = autoCalculateLoanField({
          principalAmount: Number(principalAmount),
          interestRate: Number(interestRate),
          tenure: Number(tenure),
          frequency: freq,
        })
        setValue("emiAmount", calculated.emiAmount.toString())
        setCalculatedEMI(calculated.emiAmount)
      } else if (emiAmount && Number(emiAmount) > 0) {
        const calculated = autoCalculateLoanField({
          principalAmount: Number(principalAmount),
          interestRate: Number(interestRate),
          emiAmount: Number(emiAmount),
          frequency: freq,
        })
        setValue("tenure", calculated.tenure.toString())
        setCalculatedTenure(calculated.tenure)
      }
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

  const calculateDueDates = (tenureValue: number): Date[] => {
    const dueDates: Date[] = []
    const start = new Date(startDate)

    if (emiFrequency === "MONTHLY") {
      // Monthly frequency: generate due dates for each month
      for (let i = 1; i <= tenureValue; i++) {
        const dueDate = new Date(start)
        dueDate.setMonth(dueDate.getMonth() + i)
        dueDates.push(dueDate)
      }
    } else if (paymentSchedule && paymentSchedule.length > 0) {
      // For QUARTERLY, HALF_YEARLY, ANNUALLY, CUSTOM: use payment schedule
      const startYear = start.getFullYear()
      const monthsIncrement = emiFrequency === "QUARTERLY" ? 3 : emiFrequency === "HALF_YEARLY" ? 6 : emiFrequency === "ANNUALLY" ? 12 : 1

      // Convert tenure to months based on frequency
      const tenureInMonths = emiFrequency === "QUARTERLY" ? tenureValue * 3
                           : emiFrequency === "HALF_YEARLY" ? tenureValue * 6
                           : emiFrequency === "ANNUALLY" ? tenureValue * 12
                           : tenureValue // CUSTOM and others

      let totalPayments: number
      if (emiFrequency === "CUSTOM") {
        totalPayments = tenureValue // For custom, tenure represents number of payments
      } else {
        totalPayments = Math.ceil(tenureInMonths / monthsIncrement)
      }

      // Generate due dates for each year
      for (let year = 0; year < Math.ceil(totalPayments / paymentSchedule.length) + 2; year++) {
        for (const scheduleDate of paymentSchedule) {
          const dueDate = new Date(startYear + year, scheduleDate.month - 1, scheduleDate.day)

          // Only add if the due date is after the start date (not on the start date)
          if (dueDate > start) {
            dueDates.push(dueDate)

            // Stop when we have enough payments
            if (dueDates.length >= totalPayments) {
              return dueDates
            }
          }
        }
      }
    } else {
      // Fallback to simple increment
      const monthsIncrement = emiFrequency === "QUARTERLY" ? 3 : emiFrequency === "HALF_YEARLY" ? 6 : emiFrequency === "ANNUALLY" ? 12 : 1

      // Convert tenure to months based on frequency
      const tenureInMonths = emiFrequency === "QUARTERLY" ? tenureValue * 3
                           : emiFrequency === "HALF_YEARLY" ? tenureValue * 6
                           : emiFrequency === "ANNUALLY" ? tenureValue * 12
                           : tenureValue

      const totalPayments = Math.ceil(tenureInMonths / monthsIncrement)

      for (let i = 1; i <= totalPayments; i++) {
        const dueDate = new Date(start)
        dueDate.setMonth(dueDate.getMonth() + (i * monthsIncrement))
        dueDates.push(dueDate)
      }
    }

    return dueDates
  }

  const initializeCustomEMIs = () => {
    const tenureValue = Number(tenure) || calculatedTenure || 0
    const emiAmountValue = Number(emiAmount) || calculatedEMI || 0

    if (tenureValue > 0 && emiAmountValue > 0 && startDate) {
      const emis: CustomEMI[] = []
      const dueDates = calculateDueDates(tenureValue)

      // If editing a loan, use actual EMI data
      if (loan?.emis && loan.emis.length > 0) {
        for (let i = 1; i <= tenureValue; i++) {
          const existingEmi = loan.emis.find(e => e.installmentNumber === i)
          emis.push({
            installmentNumber: i,
            amount: existingEmi?.paidAmount?.toString() || emiAmountValue.toString(),
            dueDate: dueDates[i - 1] || new Date(),
            isPaid: existingEmi?.isPaid || false,
          })
        }
      } else {
        // Creating new loan - all EMIs are unpaid
        for (let i = 1; i <= tenureValue; i++) {
          emis.push({
            installmentNumber: i,
            amount: emiAmountValue.toString(),
            dueDate: dueDates[i - 1] || new Date(),
            isPaid: false,
          })
        }
      }

      setCustomEMIs(emis)
    }
  }

  const updateCustomEMI = (index: number, amount: string) => {
    const updated = [...customEMIs]
    updated[index].amount = amount
    setCustomEMIs(updated)
  }

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof LoanFormData)[] = []

    if (currentStep === 1) {
      fieldsToValidate = [
        "loanType",
        "institution",
        "accountHolderName",
        "principalAmount",
        "interestRate",
        "startDate",
      ]

      // Validate gold items if GOLD_LOAN
      if (isGoldLoan && goldItems.length === 0) {
        toast.error("Please add at least one gold item for gold loan")
        return
      }

      if (isGoldLoan) {
        for (const item of goldItems) {
          if (!item.title || !item.carat || !item.quantity || !item.grossWeight || !item.netWeight) {
            toast.error("Please fill all required fields for gold items")
            return
          }
        }
      }
    } else if (currentStep === 2) {
      fieldsToValidate = ["emiFrequency"]

      // Validate that either tenure or emiAmount is provided
      if (!tenure && !emiAmount && !calculatedTenure && !calculatedEMI) {
        toast.error("Please provide either tenure or EMI amount")
        return
      }

      // Validate payment schedule
      const scheduleError = validatePaymentSchedule()
      if (scheduleError) {
        toast.error(scheduleError)
        return
      }

      // Initialize custom EMIs for step 3
      initializeCustomEMIs()
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const onSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true)

      const payload = {
        loanType: data.loanType,
        institution: data.institution,
        accountHolderName: data.accountHolderName,
        principalAmount: Number(data.principalAmount),
        interestRate: Number(data.interestRate),
        tenure: data.tenure ? Number(data.tenure) : calculatedTenure || undefined,
        emiAmount: data.emiAmount ? Number(data.emiAmount) : calculatedEMI || undefined,
        emiFrequency: data.emiFrequency,
        paymentSchedule: data.emiFrequency !== "MONTHLY" ? { dates: paymentSchedule } : undefined,
        startDate: data.startDate,
        accountNumber: data.accountNumber || undefined,
        description: data.description || undefined,
        goldItems: isGoldLoan ? goldItems.map(item => ({
          title: item.title,
          carat: Number(item.carat),
          quantity: Number(item.quantity),
          grossWeight: Number(item.grossWeight),
          netWeight: Number(item.netWeight),
          loanAmount: item.loanAmount ? Number(item.loanAmount) : undefined,
        })) : undefined,
        customEMIs: customEMIs.length > 0 ? customEMIs
          .filter(emi => !emi.isPaid) // Only send unpaid EMIs
          .map(emi => ({
            installmentNumber: emi.installmentNumber,
            amount: Number(emi.amount),
          })) : undefined,
      }

      const url = loan ? `/api/loans/${loan.id}` : "/api/loans"
      const method = loan ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${loan ? 'update' : 'create'} loan`)
      }

      toast.success(`Loan ${loan ? 'updated' : 'created'} successfully!`)
      reset()
      setInstitutionInput("")
      setPaymentSchedule([])
      setGoldItems([])
      setCalculatedTenure(null)
      setCalculatedEMI(null)
      setCustomEMIs([])
      setCurrentStep(1)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error(`Error ${loan ? 'updating' : 'creating'} loan:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${loan ? 'update' : 'create'} loan`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPaymentScheduleInputs = () => {
    if (emiFrequency === "MONTHLY" || !emiFrequency) {
      return null
    }

    return (
      <div className="space-y-3 p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
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

        <div className="flex flex-wrap gap-2">
          {paymentSchedule.map((date, index) => (
            <div key={index} className="flex items-center gap-1.5 p-2 bg-white dark:bg-gray-800 rounded border">
              <Select
                value={date.month.toString()}
                onValueChange={(value) => updatePaymentScheduleDate(index, "month", Number(value))}
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label.substring(0, 3)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min="1"
                max="31"
                value={date.day}
                onChange={(e) => updatePaymentScheduleDate(index, "day", Number(e.target.value))}
                placeholder="Day"
                className="h-8 w-14 text-xs"
              />

              {emiFrequency === "CUSTOM" && paymentSchedule.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCustomDate(index)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {emiFrequency === "QUARTERLY" && "Specify 4 payment dates for quarterly payments"}
          {emiFrequency === "HALF_YEARLY" && "Specify 2 payment dates for half-yearly payments"}
          {emiFrequency === "ANNUALLY" && "Specify 1 payment date for annual payment"}
          {emiFrequency === "CUSTOM" && "Add custom payment dates throughout the year"}
        </p>
      </div>
    )
  }

  const renderStep1 = () => (
    <div className="space-y-4 sm:space-y-6">
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

      <div className="space-y-2">
        <Label htmlFor="accountHolderName">
          Account Holder Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="accountHolderName"
          placeholder="Enter account holder name"
          {...register("accountHolderName")}
        />
        {errors.accountHolderName && (
          <p className="text-sm text-red-500">{errors.accountHolderName.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Name of the person who holds the loan account
        </p>
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

      {/* Gold Items Section - Only for GOLD_LOAN */}
      {isGoldLoan && (
        <div className="space-y-4 border-t-2 pt-6 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Gold Items Pledged</Label>
              <p className="text-xs text-muted-foreground mt-1">Add details of gold items used as collateral</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGoldItems([...goldItems, {
                title: "",
                carat: "22",
                quantity: "1",
                grossWeight: "",
                netWeight: "",
                loanAmount: "",
              }])}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {goldItems.map((item, index) => (
            <div key={index} className="p-4 border-2 rounded-lg space-y-3 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <Label className="font-medium text-base">Item {index + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setGoldItems(goldItems.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Item Title <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g., Gold Chain, Ring, Necklace"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...goldItems]
                      updated[index].title = e.target.value
                      setGoldItems(updated)
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Carat (K) <span className="text-red-500">*</span></Label>
                    <Select
                      value={item.carat}
                      onValueChange={(value) => {
                        const updated = [...goldItems]
                        updated[index].carat = value
                        setGoldItems(updated)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[18, 20, 22, 24].map((k) => (
                          <SelectItem key={k} value={k.toString()}>{k}K Gold</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Quantity <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...goldItems]
                        updated[index].quantity = e.target.value
                        setGoldItems(updated)
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Loan Amount</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      value={item.loanAmount}
                      onChange={(e) => {
                        const updated = [...goldItems]
                        updated[index].loanAmount = e.target.value
                        setGoldItems(updated)
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Gross Weight (grams) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={item.grossWeight}
                      onChange={(e) => {
                        const updated = [...goldItems]
                        updated[index].grossWeight = e.target.value
                        setGoldItems(updated)
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Net Weight (grams) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={item.netWeight}
                      onChange={(e) => {
                        const updated = [...goldItems]
                        updated[index].netWeight = e.target.value
                        setGoldItems(updated)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {goldItems.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-yellow-300 dark:border-yellow-700 rounded-lg bg-yellow-50/50 dark:bg-yellow-900/5">
              <p className="text-sm text-muted-foreground">
                No items added yet. Click &quot;Add Item&quot; to add gold items pledged for this loan.
              </p>
            </div>
          )}
        </div>
      )}

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
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 sm:space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="emiAmount">
            EMI Amount (₹) {!tenure && !calculatedTenure && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="emiAmount"
            type="number"
            step="0.01"
            placeholder="5000"
            {...register("emiAmount")}
            onChange={(e) => {
              setValue("emiAmount", e.target.value)
            }}
            onBlur={(e) => {
              // Calculate tenure when EMI is provided and tenure is empty
              if (e.target.value && principalAmount && interestRate && !tenure) {
                try {
                  const calculated = autoCalculateLoanField({
                    principalAmount: Number(principalAmount),
                    interestRate: Number(interestRate),
                    emiAmount: Number(e.target.value),
                    frequency: emiFrequency,
                  })
                  setValue("tenure", calculated.tenure.toString())
                  setCalculatedTenure(calculated.tenure)
                  setCalculatedEMI(null)

                  // Update payment schedule when tenure is calculated
                  if (emiFrequency) {
                    initializePaymentSchedule(emiFrequency, calculated.tenure)
                  }
                } catch {
                  setCalculatedTenure(null)
                }
              } else {
                setCalculatedTenure(null)
              }
            }}
          />
          {errors.emiAmount && (
            <p className="text-sm text-red-500">{errors.emiAmount.message}</p>
          )}
          {calculatedTenure && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Calculated Tenure: {calculatedTenure} {getTenureLabel().toLowerCase().replace("tenure ", "")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenure">
            {getTenureLabel()} {!emiAmount && !calculatedEMI && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="tenure"
            type="number"
            placeholder={emiFrequency === "MONTHLY" ? "240" : emiFrequency === "QUARTERLY" ? "80" : emiFrequency === "HALF_YEARLY" ? "40" : emiFrequency === "ANNUALLY" ? "20" : "24"}
            {...register("tenure")}
            onChange={(e) => {
              setValue("tenure", e.target.value)
              // Clear calculated EMI when user types
              if (e.target.value) {
                setCalculatedEMI(null)
                setValue("emiAmount", "")
              }
            }}
            onBlur={(e) => {
              // Calculate EMI when tenure is provided
              if (e.target.value && principalAmount && interestRate) {
                try {
                  const calculated = autoCalculateLoanField({
                    principalAmount: Number(principalAmount),
                    interestRate: Number(interestRate),
                    tenure: Number(e.target.value),
                    frequency: emiFrequency,
                  })
                  setValue("emiAmount", calculated.emiAmount.toString())
                  setCalculatedEMI(calculated.emiAmount)
                  setCalculatedTenure(null)
                } catch (error) {
                  console.error("Error calculating EMI:", error)
                  setCalculatedEMI(null)
                }
              } else if (!e.target.value) {
                setCalculatedEMI(null)
              }

              // Update payment schedule when tenure changes
              if (emiFrequency && e.target.value) {
                initializePaymentSchedule(emiFrequency, Number(e.target.value))
              }
            }}
          />
          {errors.tenure && (
            <p className="text-sm text-red-500">{errors.tenure.message}</p>
          )}
          {calculatedEMI && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Calculated EMI Amount: ₹{calculatedEMI.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {renderPaymentScheduleInputs()}

      {/* Summary */}
      {(tenure || calculatedTenure) && (emiAmount || calculatedEMI) && principalAmount && interestRate && (
        <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <Label className="text-sm font-semibold mb-2 block">Loan Summary</Label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Principal Amount:</span>
              <p className="font-medium">₹{Number(principalAmount).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Interest Rate:</span>
              <p className="font-medium">{interestRate}% per annum</p>
            </div>
            <div>
              <span className="text-muted-foreground">EMI Amount:</span>
              <p className="font-medium">₹{(Number(emiAmount) || calculatedEMI || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tenure:</span>
              <p className="font-medium">{Number(tenure) || calculatedTenure || 0} {getTenureLabel().toLowerCase().replace("tenure ", "")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Total Amount Payable:</span>
              <p className="font-medium text-lg">₹{((Number(emiAmount) || calculatedEMI || 0) * (Number(tenure) || calculatedTenure || 0)).toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Total Interest:</span>
              <p className="font-medium text-lg text-orange-600">₹{(((Number(emiAmount) || calculatedEMI || 0) * (Number(tenure) || calculatedTenure || 0)) - Number(principalAmount)).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep3 = () => {
    // Filter EMIs based on search term
    const filteredEMIs = customEMIs.filter(emi => {
      if (!emiSearchTerm) return true
      const searchLower = emiSearchTerm.toLowerCase()
      const formattedDueDate = emi.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })
      return (
        emi.installmentNumber.toString().includes(searchLower) ||
        emi.amount.includes(searchLower) ||
        formattedDueDate.includes(emiSearchTerm)
      )
    })

    // Calculate pagination
    const totalPages = Math.ceil(filteredEMIs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedEMIs = filteredEMIs.slice(startIndex, endIndex)

    return (
      <div className="flex flex-col space-y-4 h-full min-h-0">
        {/* Info alert when button clicked */}
        {showMobileInfo && (
          <div className="p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 flex-shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted-foreground flex-1">
                You can customize the EMI amount for each installment. The default EMI amount is shown for all installments.
                This is useful if you want to pay different amounts for different installments.
                {loan && <span className="block mt-2 text-green-600 dark:text-green-400 font-medium">Note: Installments that are already paid cannot be edited.</span>}
              </p>
              <button
                onClick={() => setShowMobileInfo(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Info button when search is not shown */}
        {customEMIs?.length <= 10 && (
          <div className="flex justify-start sm:justify-end flex-shrink-0">
            <button
              onClick={() => setShowMobileInfo(!showMobileInfo)}
              className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all animate-pulse"
              aria-label="Show information"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        {customEMIs?.length > 10 && (
          <div className="flex items-center gap-2 justify-between flex-shrink-0">
            <div className="flex items-center gap-2 flex-1">
              {/* Mobile: Info button on left with glowing effect */}
              <button
                onClick={() => setShowMobileInfo(!showMobileInfo)}
                className="sm:hidden flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all animate-pulse"
                aria-label="Show information"
              >
                <Info className="h-4 w-4" />
              </button>
              <Input
                type="text"
                placeholder="Search by #, amount or date (dd/MM/yy)..."
                value={emiSearchTerm}
                onChange={(e) => {
                  setEmiSearchTerm(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
                }}
                className="h-9 flex-1"
              />
            </div>
            {/* Desktop: Info button on right with glowing effect */}
            <button
              onClick={() => setShowMobileInfo(!showMobileInfo)}
              className="hidden sm:flex flex-shrink-0 h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all animate-pulse"
              aria-label="Show information"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* EMI List */}
        <div className="border rounded-lg flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
            {paginatedEMIs.length > 0 && paginatedEMIs.map((emi) => {
              const actualIndex = customEMIs.findIndex(e => e.installmentNumber === emi.installmentNumber)
              const isPaid = emi.isPaid || false
              const formattedDueDate = emi.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })

              // Color scheme for due date pill
              const pillBgColor = isPaid
                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'

              const pillTextColor = isPaid
                ? 'text-green-700 dark:text-green-300'
                : 'text-orange-700 dark:text-orange-300'

              return (
                <div key={emi.installmentNumber} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 border rounded-lg ${isPaid ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-900'}`}>
                  {/* Mobile: Installment # and Amount row | Desktop: Just Installment # */}
                  <div className="flex items-center justify-between sm:justify-start sm:flex-shrink-0">
                    <Label className={`text-xs font-semibold whitespace-nowrap ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      Installment #{emi.installmentNumber}
                      {isPaid && <span className="ml-2 text-[10px] font-medium text-green-600 dark:text-green-400">PAID</span>}
                    </Label>
                    {/* Mobile: Amount on the right */}
                    <div className={`sm:hidden flex-shrink-0 text-right text-xs font-semibold ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      ₹{Number(emi.amount).toLocaleString()}
                    </div>
                  </div>

                  {/* Input and due date row */}
                  <div className="flex items-center gap-2 sm:gap-3 sm:flex-1">
                    <div className="flex-1 min-w-0">
                      <Input
                        type="number"
                        step="0.01"
                        value={emi.amount}
                        onChange={(e) => updateCustomEMI(actualIndex, e.target.value)}
                        className="h-9"
                        disabled={isPaid}
                      />
                    </div>
                    {/* Due date pill - visible on all screen sizes */}
                    <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-full border flex items-center ${pillBgColor}`}>
                      <span className={`text-xs font-semibold whitespace-nowrap ${pillTextColor}`}>
                        {formattedDueDate}
                      </span>
                    </div>
                    {/* Desktop: Amount on the right */}
                    <div className={`hidden sm:block flex-shrink-0 w-20 md:w-24 text-right text-xs sm:text-sm ${isPaid ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                      ₹{Number(emi.amount).toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Summary */}
        {customEMIs.length > 0 && (
          <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total Installments:</span>
                <p className="font-medium">{customEMIs.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <p className="font-medium">₹{customEMIs.reduce((sum, emi) => sum + Number(emi.amount), 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl xl:max-w-4xl 2xl:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 gap-0">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white">
            {loan ? "Edit Loan" : "Add New Loan"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm xl:text-base">
            Step {currentStep} of 3: {currentStep === 1 ? "Basic Loan Details" : currentStep === 2 ? "Payment Details" : "Customize EMI Schedule"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 my-4 flex-shrink-0">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full transition-colors ${
                step <= currentStep
                  ? "bg-blue-600 dark:bg-blue-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <form className="flex flex-col flex-1 min-h-0 overflow-hidden" onSubmit={(e) => {
          e.preventDefault()
          // Never auto-submit - only submit via button click
        }} onKeyDown={(e) => {
          // Prevent Enter key from submitting form on all steps
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault()
          }
        }}>
          <div className={`flex-1 overflow-y-auto pr-2 ${currentStep === 3 ? "flex flex-col min-h-0" : ""}`}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 mt-4 sm:mt-6 flex-shrink-0">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
                className="flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="flex-1 min-w-0"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                className="flex-1 min-w-0"
                onClick={handleSubmit(onSubmit)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span className="truncate">{loan ? "Updating..." : "Creating..."}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="truncate">{loan ? "Update" : "Create"}</span>
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="hidden sm:flex flex-shrink-0"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
