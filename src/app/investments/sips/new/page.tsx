"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Search } from "lucide-react"
import { convertToMonthlyAmount } from "@/lib/frequency-utils"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const BUCKETS = [
  { id: "MUTUAL_FUND", label: "Mutual Funds" },
  { id: "IND_STOCK", label: "Indian Stocks" },
  { id: "US_STOCK", label: "US Stocks" },
  { id: "CRYPTO", label: "Cryptocurrency" },
]

interface SearchResult {
  symbol?: string
  id?: string
  name: string
  category?: string
  exchange?: string
  sector?: string
  amc?: string
}

interface Holding {
  id: string
  symbol: string
  name: string
  bucket: string
}

const sipFormSchema = z.object({
  bucket: z.string().min(1, "Please select an investment type"),
  symbol: z.string().min(1, "Please select an investment"),
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"]),
  customDay: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  description: z.string().max(500, "Description too long").optional(),
  currency: z.enum(["INR", "USD"]).optional(),
  amountInINR: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.frequency === "CUSTOM") {
      if (!data.customDay) return false
      const day = Number(data.customDay)
      return !isNaN(day) && day >= 1 && day <= 31
    }
    return true
  },
  {
    message: "Custom day must be between 1 and 31 when frequency is CUSTOM",
    path: ["customDay"],
  }
).refine(
  (data) => {
    if (data.endDate && data.startDate) {
      return new Date(data.endDate) > new Date(data.startDate)
    }
    return true
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
)

type SIPFormData = z.infer<typeof sipFormSchema>

interface BucketAllocation {
  totalAllocation: number
  existingSIPs: number
  available: number
}

export default function NewSIPPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [, setIsLoadingHoldings] = useState(true)
  const [bucketAllocation, setBucketAllocation] = useState<BucketAllocation | null>(null)
  const [isLoadingAllocation, setIsLoadingAllocation] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<SIPFormData>({
    resolver: zodResolver(sipFormSchema),
    defaultValues: {
      bucket: "",
      symbol: "",
      name: "",
      amount: "",
      frequency: "MONTHLY",
      customDay: "",
      startDate: "",
      endDate: "",
      description: "",
      currency: "INR",
      amountInINR: true,
    },
  })

  const watchFrequency = form.watch("frequency")
  const watchBucket = form.watch("bucket")
  const watchSymbol = form.watch("symbol")
  const watchName = form.watch("name")
  const watchAmount = form.watch("amount")
  const watchCurrency = form.watch("currency")
  const watchAmountInINR = form.watch("amountInINR")

  // Check if amount exceeds allocation
  const monthlyAmount = convertToMonthlyAmount(Number(watchAmount) || 0, watchFrequency)
  const exceedsAllocation = bucketAllocation && monthlyAmount > bucketAllocation.available

  // Load user's holdings
  useEffect(() => {
    loadHoldings()
  }, [])

  const loadHoldings = async () => {
    try {
      setIsLoadingHoldings(true)
      const response = await fetch("/api/investments/holdings")
      if (response.ok) {
        const data = await response.json()
        const allHoldings = Object.values(data.holdings).flat() as Holding[]
        setHoldings(allHoldings.filter(h => h.bucket !== "EMERGENCY_FUND"))
      }
    } catch (error) {
      console.error("Error loading holdings:", error)
    } finally {
      setIsLoadingHoldings(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter holdings by bucket
  const filteredHoldings = watchBucket
    ? holdings.filter(h => h.bucket === watchBucket)
    : []

  // Fetch bucket allocation when bucket changes
  useEffect(() => {
    if (!watchBucket) {
      setBucketAllocation(null)
      return
    }

    const fetchBucketAllocation = async () => {
      try {
        setIsLoadingAllocation(true)
        const response = await fetch(`/api/investments/allocations/bucket/${watchBucket}`)
        if (response.ok) {
          const data = await response.json()
          setBucketAllocation(data)
        } else {
          setBucketAllocation(null)
        }
      } catch (error) {
        console.error("Error fetching bucket allocation:", error)
        setBucketAllocation(null)
      } finally {
        setIsLoadingAllocation(false)
      }
    }

    fetchBucketAllocation()
  }, [watchBucket])

  // Search for investments
  useEffect(() => {
    // Don't search if an item is already selected
    if (watchSymbol && watchName) {
      setSearchResults([])
      return
    }

    if (!watchBucket || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        let endpoint = ""
        const params = new URLSearchParams({ q: searchQuery })

        if (watchBucket === "MUTUAL_FUND") {
          endpoint = "/api/search/funds"
        } else if (watchBucket === "IND_STOCK") {
          endpoint = "/api/search/stocks"
          params.append("market", "IN")
        } else if (watchBucket === "US_STOCK") {
          endpoint = "/api/search/stocks"
          params.append("market", "US")
        } else if (watchBucket === "CRYPTO") {
          endpoint = "/api/search/crypto"
        }

        if (endpoint) {
          const response = await fetch(`${endpoint}?${params}`)
          if (response.ok) {
            const results = await response.json()
            setSearchResults(results)
            setShowResults(true)
          }
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, watchBucket, watchSymbol, watchName])

  const handleSelectResult = (result: SearchResult | Holding, event?: React.MouseEvent) => {
    event?.preventDefault()
    event?.stopPropagation()

    const selectedSymbol = result.symbol || (result as SearchResult).id || ""
    form.setValue("symbol", selectedSymbol)
    form.setValue("name", result.name)
    setSearchQuery(result.name)
    setShowResults(false)
    setSearchResults([])

    // Auto-focus to amount input after selection
    setTimeout(() => {
      amountInputRef.current?.focus()
    }, 100)
  }

  const onSubmit = async (data: SIPFormData) => {
    try {
      setIsSubmitting(true)

      const payload = {
        name: data.name,
        amount: Number(data.amount),
        frequency: data.frequency,
        customDay: data.frequency === "CUSTOM" && data.customDay ? Number(data.customDay) : undefined,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        description: data.description || undefined,
        bucket: data.bucket,
        symbol: data.symbol,
        currency: data.currency,
        amountInINR: data.amountInINR,
      }

      const response = await fetch("/api/sips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create SIP")
      }

      toast.success("SIP created successfully")
      router.push("/investments/sips")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create SIP")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSearchPlaceholder = () => {
    switch (watchBucket) {
      case "MUTUAL_FUND":
        return "Search mutual funds..."
      case "IND_STOCK":
        return "Search Indian stocks..."
      case "US_STOCK":
        return "Search US stocks..."
      case "CRYPTO":
        return "Search crypto..."
      default:
        return "First select an investment type"
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/investments/sips")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Add New SIP</h1>
            <p className="text-blue-100 dark:text-blue-200 mt-2">
              Create a new systematic investment plan
            </p>
          </div>
        </div>
      </div>

      <Card className="max-w-3xl mx-auto shadow-lg -mt-12">
        <CardHeader>
          <CardTitle>SIP Details</CardTitle>
          <CardDescription>
            Select an investment from your holdings or search for a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Investment Type */}
              <FormField
                control={form.control}
                name="bucket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Type *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue("symbol", "")
                        form.setValue("name", "")
                        setSearchQuery("")
                        setSearchResults([])
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select investment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUCKETS.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bucket Allocation Info */}
              {watchBucket && !isLoadingAllocation && bucketAllocation && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    {BUCKETS.find(b => b.id === watchBucket)?.label} Allocation
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Allocation</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        ₹{bucketAllocation.totalAllocation.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Existing SIPs</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        ₹{bucketAllocation.existingSIPs.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Available for SIP</p>
                      <p className={`text-lg font-bold ${bucketAllocation.available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ₹{bucketAllocation.available.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {bucketAllocation.available <= 0 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                      ⚠️ No allocation available. Existing SIPs have used up all allocated amount.
                    </div>
                  )}
                </div>
              )}

              {watchBucket && !isLoadingAllocation && !bucketAllocation && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ No allocation configured for {BUCKETS.find(b => b.id === watchBucket)?.label}.
                    Please go to <span className="font-semibold">Investments → Allocations</span> to set it up first.
                  </p>
                </div>
              )}

              {watchBucket && isLoadingAllocation && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading allocation info...</span>
                  </div>
                </div>
              )}

              {/* Investment Search */}
              {watchBucket && (
                <div className="space-y-2" ref={dropdownRef}>
                  <Label>Select Investment *</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Search className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (filteredHoldings.length > 0 || searchResults.length > 0) {
                          setShowResults(true)
                        }
                      }}
                      placeholder={getSearchPlaceholder()}
                      className="pl-10"
                    />

                    {/* Dropdown Results */}
                    {showResults && (filteredHoldings.length > 0 || searchResults.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {/* User Holdings */}
                        {searchQuery.length < 2 && filteredHoldings.length > 0 && (
                          <>
                            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                YOUR HOLDINGS
                              </p>
                            </div>
                            {filteredHoldings.map((holding) => (
                              <div
                                key={holding.id}
                                onMouseDown={(e) => handleSelectResult(holding, e)}
                                className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-sm">{holding.symbol}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {holding.bucket.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {holding.name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Search Results */}
                        {searchQuery.length >= 2 && searchResults.length > 0 && (
                          <>
                            <div className="px-3 py-2 bg-blue-100 dark:bg-blue-900 border-b border-blue-200 dark:border-blue-700">
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                SEARCH RESULTS
                              </p>
                            </div>
                            {searchResults.map((result, idx) => (
                              <div
                                key={idx}
                                onMouseDown={(e) => handleSelectResult(result, e)}
                                className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-sm">
                                        {result.symbol || result.id}
                                      </span>
                                      {result.exchange && (
                                        <Badge variant="outline" className="text-xs">
                                          {result.exchange}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {result.name}
                                    </p>
                                    {(result.sector || result.category || result.amc) && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {result.sector || result.category || result.amc}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                        <p className="text-sm text-muted-foreground text-center">
                          No results found. Try a different search term.
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery.length < 2
                      ? "Select from your holdings or start typing to search"
                      : "Start typing to search from our database"}
                  </p>
                </div>
              )}

              {/* Selected Investment Display */}
              {watchSymbol && watchName && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Selected: {watchSymbol}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {watchName}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        form.setValue("symbol", "")
                        form.setValue("name", "")
                        setSearchQuery("")
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}

              {/* Currency Selection - Only for US_STOCK and CRYPTO */}
              {watchBucket && (watchBucket === "US_STOCK" || watchBucket === "CRYPTO") && (
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          // Reset to INR input when changing to INR
                          if (value === "INR") {
                            form.setValue("amountInINR", true)
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the currency for this SIP
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Amount Input Option - Only when USD is selected */}
              {watchCurrency === "USD" && (watchBucket === "US_STOCK" || watchBucket === "CRYPTO") && (
                <FormField
                  control={form.control}
                  name="amountInINR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Input Option *</FormLabel>
                      <Select
                        value={field.value ? "INR" : "USD"}
                        onValueChange={(value) => {
                          field.onChange(value === "INR")
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">Enter amount in USD (Direct)</SelectItem>
                          <SelectItem value="INR">Enter amount in INR (Will convert to USD)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value
                          ? "You'll enter the amount in INR, which will be used to buy in USD"
                          : "You'll enter the amount directly in USD"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => {
                  const amount = Number(field.value) || 0
                  const frequency = form.watch("frequency")
                  const monthlyAmount = convertToMonthlyAmount(amount, frequency)
                  const exceedsLimit = bucketAllocation && monthlyAmount > bucketAllocation.available

                  // Determine currency symbol and label
                  const isUSDSIP = watchCurrency === "USD" && (watchBucket === "US_STOCK" || watchBucket === "CRYPTO")
                  const currencySymbol = isUSDSIP && !watchAmountInINR ? "$" : "₹"
                  const currencyLabel = isUSDSIP && !watchAmountInINR ? "USD" : "INR"

                  return (
                    <FormItem>
                      <FormLabel>SIP Amount ({currencyLabel}) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {currencySymbol}
                          </span>
                          <Input
                            type="number"
                            placeholder={isUSDSIP && !watchAmountInINR ? "100" : "5000"}
                            className={`pl-8 ${exceedsLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            step="0.01"
                            {...field}
                            ref={amountInputRef}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        The investment amount per installment
                        {isUSDSIP && watchAmountInINR && (
                          <span className="block mt-1 text-blue-600 dark:text-blue-400">
                            💡 This INR amount will be converted to USD at execution time
                          </span>
                        )}
                        {frequency === "YEARLY" && amount > 0 && (
                          <span className="block mt-1 text-blue-600 dark:text-blue-400">
                            Monthly equivalent: {currencySymbol}{monthlyAmount.toLocaleString()}
                          </span>
                        )}
                      </FormDescription>
                      {exceedsLimit && (
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          ⚠️ Amount exceeds available allocation of ₹{bucketAllocation.available.toLocaleString()}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {/* Frequency */}
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Frequency *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-3 space-y-0">
                          <RadioGroupItem value="MONTHLY" id="monthly" />
                          <Label htmlFor="monthly" className="font-normal cursor-pointer">
                            Monthly - Invest every month
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 space-y-0">
                          <RadioGroupItem value="YEARLY" id="yearly" />
                          <Label htmlFor="yearly" className="font-normal cursor-pointer">
                            Yearly - Invest once a year
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 space-y-0">
                          <RadioGroupItem value="CUSTOM" id="custom" />
                          <Label htmlFor="custom" className="font-normal cursor-pointer">
                            Custom - Specify a day of the month
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      How often should this investment occur?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom Day (conditional) */}
              {watchFrequency === "CUSTOM" && (
                <FormField
                  control={form.control}
                  name="customDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Day *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 15"
                          min="1"
                          max="31"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Day of the month (1-31) when the SIP should be processed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When should this SIP start?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When should this SIP end? Leave empty for ongoing SIPs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this SIP..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional details about this investment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/investments/sips")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || exceedsAllocation || (!!watchBucket && !bucketAllocation)}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : exceedsAllocation ? (
                    "Amount Exceeds Allocation"
                  ) : (watchBucket && !bucketAllocation) ? (
                    "No Allocation Set"
                  ) : (
                    "Create SIP"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}