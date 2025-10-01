import type { InvestmentBucket } from "@/types"

// Investment bucket configuration
export const INVESTMENT_BUCKETS = [
  { id: "MUTUAL_FUND" as InvestmentBucket, label: "Mutual Funds", color: "bg-blue-500" },
  { id: "IND_STOCK" as InvestmentBucket, label: "Indian Stocks", color: "bg-green-500" },
  { id: "US_STOCK" as InvestmentBucket, label: "US Stocks", color: "bg-purple-500" },
  { id: "CRYPTO" as InvestmentBucket, label: "Cryptocurrency", color: "bg-orange-500" },
  { id: "EMERGENCY_FUND" as InvestmentBucket, label: "Emergency Fund", color: "bg-red-500" },
] as const

// Bucket labels mapping - using Record<string, string> for flexibility with database values
export const BUCKET_LABELS: Record<string, string> = {
  MUTUAL_FUND: "Mutual Funds",
  IND_STOCK: "Indian Stocks",
  US_STOCK: "US Stocks",
  CRYPTO: "Cryptocurrency",
  EMERGENCY_FUND: "Emergency Fund",
}

// Bucket colors mapping - using Record<string, string> for flexibility with database values
export const BUCKET_COLORS: Record<string, string> = {
  MUTUAL_FUND: "bg-blue-500",
  IND_STOCK: "bg-green-500",
  US_STOCK: "bg-purple-500",
  CRYPTO: "bg-orange-500",
  EMERGENCY_FUND: "bg-red-500",
}
