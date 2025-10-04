import type { SelectOption } from "@/types"

export const LOAN_TYPES: readonly SelectOption[] = [
  { value: "HOME_LOAN", label: "Home Loan" },
  { value: "CAR_LOAN", label: "Car Loan" },
  { value: "PERSONAL_LOAN", label: "Personal Loan" },
  { value: "EDUCATION_LOAN", label: "Education Loan" },
  { value: "BUSINESS_LOAN", label: "Business Loan" },
  { value: "GOLD_LOAN", label: "Gold Loan" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "OTHER", label: "Other" },
] as const

export const EMI_FREQUENCIES: readonly SelectOption[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-Yearly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "CUSTOM", label: "Custom Date" },
] as const

export const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  ANNUALLY: "Annually",
  CUSTOM: "Custom",
}

export function getLoanTypeLabel(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}

export function getFrequencyLabel(frequency: string): string {
  return FREQUENCY_LABELS[frequency] || frequency
}

export type LoanType = (typeof LOAN_TYPES)[number]["value"]
export type EMIFrequency = (typeof EMI_FREQUENCIES)[number]["value"]
