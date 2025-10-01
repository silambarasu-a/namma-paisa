import type { SelectOption } from "@/types"

// Income categories
export const INCOME_CATEGORIES: readonly SelectOption[] = [
  { value: "FREELANCE", label: "Freelance" },
  { value: "BONUS", label: "Bonus" },
  { value: "GIFT", label: "Gift" },
  { value: "INVESTMENT_RETURN", label: "Investment Return" },
  { value: "REFUND", label: "Refund" },
  { value: "RENTAL", label: "Rental Income" },
  { value: "BUSINESS", label: "Business Income" },
  { value: "OTHER", label: "Other" },
] as const

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]["value"]
