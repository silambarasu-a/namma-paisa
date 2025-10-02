// Common shared types
export interface AvailableAmount {
  salary: number
  taxAmount: number
  totalLoans: number
  totalSIPs: number
  availableForExpenses: number
  expectedBudget?: number
  unexpectedBudget?: number
  hasBudget?: boolean
}

// Generic select option interface
export interface SelectOption<T = string> {
  value: T
  label: string
}

// Month option
export interface MonthOption {
  value: string
  label: string
}
