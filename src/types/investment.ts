// Investment bucket types
export type InvestmentBucket =
  | "MUTUAL_FUND"
  | "IND_STOCK"
  | "US_STOCK"
  | "CRYPTO"
  | "EMERGENCY_FUND"

// Transaction types
export type TransactionType =
  | "ONE_TIME_PURCHASE"
  | "SIP_EXECUTION"
  | "MANUAL_ENTRY"
  | "MANUAL_EDIT"

export type ExecutionStatus = "SUCCESS" | "FAILED" | "PENDING"

export type SIPFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM"

// Transaction interface
export interface Transaction {
  id: string
  userId: string
  holdingId?: string | null
  bucket: InvestmentBucket
  symbol: string
  name: string
  qty: number
  price: number
  amount: number
  currency: string
  amountInr?: number | null
  transactionType: TransactionType
  purchaseDate: string
  description?: string | null
  usdInrRate?: number | null
  createdAt: string
  updatedAt: string
}

// SIP Execution interface
export interface SIPExecution {
  id: string
  sipId: string
  userId: string
  holdingId?: string | null
  executionDate: string
  amount: number
  currency: string
  amountInr?: number | null
  qty?: number | null
  price?: number | null
  status: ExecutionStatus
  errorMessage?: string | null
  usdInrRate?: number | null
  createdAt: string
  updatedAt: string
}

// SIP types
export interface SIP {
  id: string
  name: string
  amount: number
  frequency: SIPFrequency
  customDay?: number | null
  startDate: string
  endDate?: string | null
  isActive: boolean
  description?: string | null
  bucket?: InvestmentBucket | null
  symbol?: string | null
  currency: string
  amountInINR: boolean
  createdAt: string
  updatedAt: string
}

// Holding types
export interface Holding {
  id: string
  bucket: string
  symbol: string
  name: string
  qty: number
  avgCost: number
  currentPrice: number | null
  currency: string
  usdInrRate?: number | null
  isManual: boolean
  createdAt: string
  updatedAt: string
}

// Allocation types
export interface InvestmentAllocation {
  bucket: string
  allocationType: "PERCENTAGE" | "AMOUNT"
  percent?: number | null
  customAmount?: number | null
}
