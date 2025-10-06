// Search result types for investment lookups
export interface SearchResult {
  symbol?: string
  id?: string
  name: string
  category?: string
  exchange?: string
  sector?: string
  amc?: string
}

// Bucket allocation information
export interface BucketAllocation {
  totalAllocation: number
  existingSIPs: number
  available: number
}
