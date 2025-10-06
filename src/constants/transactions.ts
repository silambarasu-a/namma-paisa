import type { SelectOption, TransactionType, ExecutionStatus, SIPFrequency } from "@/types"

// Transaction type options
export const TRANSACTION_TYPES: readonly SelectOption<TransactionType>[] = [
  { value: "ONE_TIME_PURCHASE", label: "One-Time Purchase" },
  { value: "SIP_EXECUTION", label: "SIP Execution" },
  { value: "MANUAL_ENTRY", label: "Manual Entry" },
  { value: "MANUAL_EDIT", label: "Manual Edit" },
] as const

// Transaction type labels mapping
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ONE_TIME_PURCHASE: "One-Time Purchase",
  SIP_EXECUTION: "SIP Execution",
  MANUAL_ENTRY: "Manual Entry",
  MANUAL_EDIT: "Manual Edit",
}

// Transaction type colors mapping
export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  ONE_TIME_PURCHASE: "bg-blue-500",
  SIP_EXECUTION: "bg-green-500",
  MANUAL_ENTRY: "bg-gray-500",
  MANUAL_EDIT: "bg-yellow-500",
}

// Execution status options
export const EXECUTION_STATUSES: readonly SelectOption<ExecutionStatus>[] = [
  { value: "SUCCESS", label: "Success" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
] as const

// Execution status labels mapping
export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  SUCCESS: "Success",
  FAILED: "Failed",
  PENDING: "Pending",
}

// Execution status colors mapping
export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  SUCCESS: "bg-green-500",
  FAILED: "bg-red-500",
  PENDING: "bg-yellow-500",
}

// SIP frequency options
export const SIP_FREQUENCIES: readonly SelectOption<SIPFrequency>[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-Yearly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
] as const

// SIP frequency labels mapping
export const SIP_FREQUENCY_LABELS: Record<SIPFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  YEARLY: "Yearly",
  CUSTOM: "Custom",
}

// SIP frequency badge colors (for UI display)
export const SIP_FREQUENCY_BADGE_COLORS: Record<SIPFrequency, string> = {
  DAILY: "bg-orange-50 text-orange-700 border-orange-200",
  WEEKLY: "bg-cyan-50 text-cyan-700 border-cyan-200",
  MONTHLY: "bg-blue-50 text-blue-700 border-blue-200",
  QUARTERLY: "bg-indigo-50 text-indigo-700 border-indigo-200",
  HALF_YEARLY: "bg-violet-50 text-violet-700 border-violet-200",
  YEARLY: "bg-green-50 text-green-700 border-green-200",
  CUSTOM: "bg-purple-50 text-purple-700 border-purple-200",
}
