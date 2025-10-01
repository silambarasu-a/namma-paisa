// Investment bucket types
export type InvestmentBucket =
  | "MUTUAL_FUND"
  | "IND_STOCK"
  | "US_STOCK"
  | "CRYPTO"
  | "EMERGENCY_FUND"

// SIP types
export interface SIP {
  id: string
  name: string
  amount: number
  frequency: "MONTHLY" | "YEARLY" | "CUSTOM"
  customDay?: number | null
  startDate: string
  endDate?: string | null
  isActive: boolean
  description?: string | null
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
}

// Allocation types
export interface InvestmentAllocation {
  bucket: string
  allocationType: "PERCENTAGE" | "AMOUNT"
  percent?: number | null
  customAmount?: number | null
}
