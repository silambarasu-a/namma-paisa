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
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
] as const

// SIP frequency labels mapping
export const SIP_FREQUENCY_LABELS: Record<SIPFrequency, string> = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  CUSTOM: "Custom",
}
