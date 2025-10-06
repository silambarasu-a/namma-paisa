"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, Search } from "lucide-react"
import { convertToMonthlyAmount, getFrequencyLabel } from "@/lib/frequency-utils"
import type { SIPFrequency, Holding, SIP, SearchResult, BucketAllocation } from "@/types"
import { INVESTMENT_BUCKETS } from "@/constants"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

// Filter out EMERGENCY_FUND for SIPs
const BUCKETS = INVESTMENT_BUCKETS.filter(b => b.id !== "EMERGENCY_FUND")

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

const sipEditSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  endDate: z.string().optional(),
  isActive: z.boolean(),
  description: z.string().max(500, "Description too long").optional(),
  currency: z.enum(["INR", "USD"]).optional(),
  amountInINR: z.boolean().optional(),
})

type SIPFormData = z.infer<typeof sipFormSchema>
type SIPEditData = z.infer<typeof sipEditSchema>

interface SIPDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  sipId?: string
  onSuccess?: () => void
}

export default function SIPDialog({ open, onOpenChange, mode, sipId, onSuccess }: SIPDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [bucketAllocation, setBucketAllocation] = useState<BucketAllocation | null>(null)
  const [isLoadingAllocation, setIsLoadingAllocation] = useState(false)
  const [isLoadingSIP, setIsLoadingSIP] = useState(false)
  const [sip, setSip] = useState<SIP | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const createForm = useForm<SIPFormData>({
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

  const editForm = useForm<SIPEditData>({
    resolver: zodResolver(sipEditSchema),
    defaultValues: {
      name: "",
      amount: "",
      endDate: "",
      isActive: true,
      description: "",
      currency: "INR",
      amountInINR: true,
    },
  })

  const watchFrequency = mode === 'create' ? createForm.watch("frequency") : undefined
  const watchBucket = mode === 'create' ? createForm.watch("bucket") : sip?.bucket || ""
  const watchSymbol = mode === 'create' ? createForm.watch("symbol") : sip?.symbol || ""
  const watchName = mode === 'create' ? createForm.watch("name") : editForm.watch("name")
  const watchAmount = mode === 'create' ? createForm.watch("amount") : editForm.watch("amount")
  const watchCurrency = mode === 'create' ? createForm.watch("currency") : editForm.watch("currency")
  const watchAmountInINR = mode === 'create' ? createForm.watch("amountInINR") : editForm.watch("amountInINR")

  // Check if amount exceeds allocation (only for create mode)
  const monthlyAmount = mode === 'create' && watchFrequency
    ? convertToMonthlyAmount(Number(watchAmount) || 0, watchFrequency)
    : 0
  const exceedsAllocation = mode === 'create' && bucketAllocation && monthlyAmount > bucketAllocation.available

  // Load user's holdings (create mode only)
  useEffect(() => {
    if (mode === 'create' && open) {
      loadHoldings()
    }
  }, [mode, open])

  // Load SIP data for edit mode
  useEffect(() => {
    if (mode === 'edit' && sipId && open) {
      loadSIPData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sipId, open])

  // Reset forms when dialog opens/closes
  useEffect(() => {
    if (!open) {
      createForm.reset()
      editForm.reset()
      setSearchQuery("")
      setSearchResults([])
      setShowResults(false)
      setBucketAllocation(null)
      setSip(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loadHoldings = async () => {
    try {
      const response = await fetch("/api/investments/holdings")
      if (response.ok) {
        const data = await response.json()
        const allHoldings = Object.values(data.holdings).flat() as Holding[]
        setHoldings(allHoldings.filter(h => h.bucket !== "EMERGENCY_FUND"))
      }
    } catch (error) {
      console.error("Error loading holdings:", error)
    }
  }

  const loadSIPData = async () => {
    try {
      setIsLoadingSIP(true)
      const response = await fetch("/api/sips")
      if (!response.ok) throw new Error("Failed to fetch SIPs")
      const sips = await response.json()
      const foundSip = sips.find((s: SIP) => s.id === sipId)

      if (!foundSip) {
        toast.error("SIP not found")
        onOpenChange(false)
        return
      }

      setSip(foundSip)
      editForm.reset({
        name: foundSip.name,
        amount: String(foundSip.amount),
        endDate: foundSip.endDate ? new Date(foundSip.endDate).toISOString().split("T")[0] : "",
        isActive: foundSip.isActive,
        description: foundSip.description || "",
        currency: (foundSip.currency as "INR" | "USD") || "INR",
        amountInINR: foundSip.amountInINR ?? true,
      })
    } catch (error) {
      toast.error("Failed to load SIP")
      console.error(error)
      onOpenChange(false)
    } finally {
      setIsLoadingSIP(false)
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

  // Filter holdings by bucket (create mode only)
  const filteredHoldings = mode === 'create' && watchBucket
    ? holdings.filter(h => h.bucket === watchBucket)
    : []

  // Fetch bucket allocation when bucket changes (create mode only)
  useEffect(() => {
    if (mode !== 'create' || !watchBucket) {
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
  }, [mode, watchBucket])

  // Search for investments (create mode only)
  useEffect(() => {
    if (mode !== 'create') return

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
  }, [mode, searchQuery, watchBucket, watchSymbol, watchName])

  const handleSelectResult = (result: SearchResult | Holding, event?: React.MouseEvent) => {
    if (mode !== 'create') return

    event?.preventDefault()
    event?.stopPropagation()

    const selectedSymbol = result.symbol || (result as SearchResult).id || ""
    createForm.setValue("symbol", selectedSymbol)
    createForm.setValue("name", result.name)
    setSearchQuery(result.name)
    setShowResults(false)
    setSearchResults([])

    // Auto-focus to amount input after selection
    setTimeout(() => {
      amountInputRef.current?.focus()
    }, 100)
  }

  const onSubmitCreate = async (data: SIPFormData) => {
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
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create SIP")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmitEdit = async (data: SIPEditData) => {
    if (!sipId) return

    try {
      setIsSubmitting(true)

      const payload = {
        name: data.name,
        amount: Number(data.amount),
        endDate: data.endDate || null,
        isActive: data.isActive,
        description: data.description || undefined,
        currency: data.currency,
        amountInINR: data.amountInINR,
      }

      const response = await fetch(`/api/sips/${sipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update SIP")
      }

      toast.success("SIP updated successfully")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update SIP")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSearchPlaceholder = () => {
    if (mode !== 'create') return ""

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getDisplayFrequency = (frequency: string, customDay?: number | null) => {
    if (frequency === "CUSTOM" && customDay) {
      return `Custom (Day ${customDay} of month)`
    }
    return getFrequencyLabel(frequency as SIPFrequency)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[calc(100vh-2rem)] flex flex-col bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none rounded-lg"></div>
        <div className="relative flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 p-6 pb-0">
            <DialogHeader>
              <DialogTitle>{mode === 'create' ? 'Add New SIP' : 'Edit SIP'}</DialogTitle>
              <DialogDescription>
                {mode === 'create'
                  ? 'Create a new systematic investment plan'
                  : 'Update your systematic investment plan'}
              </DialogDescription>
            </DialogHeader>
          </div>

          {isLoadingSIP ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : mode === 'create' ? (
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit(onSubmitCreate)}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto px-6 space-y-6 mt-6">
                {/* Investment Type */}
                <FormField
                  control={createForm.control}
                  name="bucket"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Type *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          createForm.setValue("symbol", "")
                          createForm.setValue("name", "")
                          setSearchQuery("")
                          setSearchResults([])
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
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

                {/* Create Mode: Bucket Allocation Info */}
                {mode === 'create' && watchBucket && !isLoadingAllocation && bucketAllocation && (
                  <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-lg border-2 border-blue-200/50 dark:border-blue-800/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none rounded-lg"></div>
                    <div className="relative">
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
                        <div className="mt-3 p-2 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded text-xs text-red-600 dark:text-red-400">
                          No allocation available. Existing SIPs have used up all allocated amount.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {mode === 'create' && watchBucket && !isLoadingAllocation && !bucketAllocation && (
                  <div className="p-4 bg-gradient-to-r from-orange-50/80 to-amber-50/80 dark:from-orange-900/20 dark:to-amber-900/20 backdrop-blur-sm rounded-lg border-2 border-orange-200/50 dark:border-orange-800/50">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      No allocation configured for {BUCKETS.find(b => b.id === watchBucket)?.label}.
                      Please go to <span className="font-semibold">Investments - Allocations</span> to set it up first.
                    </p>
                  </div>
                )}

                {mode === 'create' && watchBucket && isLoadingAllocation && (
                  <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading allocation info...</span>
                    </div>
                  </div>
                )}

                {/* Create Mode: Investment Search */}
                {mode === 'create' && watchBucket && (
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
                        className="pl-10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                      />

                      {/* Dropdown Results */}
                      {showResults && (filteredHoldings.length > 0 || searchResults.length > 0) && (
                        <div className="absolute z-50 w-full mt-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {/* User Holdings */}
                          {searchQuery.length < 2 && filteredHoldings.length > 0 && (
                            <>
                              <div className="px-3 py-2 bg-gradient-to-r from-gray-100/80 to-slate-100/80 dark:from-gray-700/80 dark:to-slate-700/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-600/50">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                  YOUR HOLDINGS
                                </p>
                              </div>
                              {filteredHoldings.map((holding) => (
                                <div
                                  key={holding.id}
                                  onMouseDown={(e) => handleSelectResult(holding, e)}
                                  className="px-4 py-3 hover:bg-gradient-to-r hover:from-gray-100/50 hover:to-slate-100/50 dark:hover:from-gray-700/50 dark:hover:to-slate-700/50 cursor-pointer border-b border-gray-100/50 dark:border-gray-700/50 last:border-0"
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
                              <div className="px-3 py-2 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 dark:from-blue-900/80 dark:to-indigo-900/80 backdrop-blur-sm border-b border-blue-200/50 dark:border-blue-700/50">
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                  SEARCH RESULTS
                                </p>
                              </div>
                              {searchResults.map((result, idx) => (
                                <div
                                  key={idx}
                                  onMouseDown={(e) => handleSelectResult(result, e)}
                                  className="px-4 py-3 hover:bg-gradient-to-r hover:from-gray-100/50 hover:to-slate-100/50 dark:hover:from-gray-700/50 dark:hover:to-slate-700/50 cursor-pointer border-b border-gray-100/50 dark:border-gray-700/50 last:border-0"
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
                        <div className="absolute z-50 w-full mt-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg p-4">
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

                {/* Create Mode: Selected Investment Display */}
                {mode === 'create' && watchSymbol && watchName && (
                  <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-lg border border-blue-200/50 dark:border-blue-800/50">
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
                          createForm.setValue("symbol", "")
                          createForm.setValue("name", "")
                          setSearchQuery("")
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Currency Selection - Only for US_STOCK and CRYPTO */}
                {(watchBucket === "US_STOCK" || watchBucket === "CRYPTO") && (
                  <FormField
                    control={createForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            if (value === "INR") {
                              createForm.setValue("amountInINR", true)
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
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
                    control={createForm.control}
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
                            <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
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
                  control={createForm.control}
                  name="amount"
                  render={({ field }) => {
                    const amount = Number(field.value) || 0
                    const frequency = watchFrequency
                    const monthlyAmount = frequency ? convertToMonthlyAmount(amount, frequency) : 0
                    const exceedsLimit = bucketAllocation && monthlyAmount > bucketAllocation.available

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
                              className={`pl-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm ${exceedsLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
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
                              This INR amount will be converted to USD at execution time
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
                            Amount exceeds available allocation of ₹{bucketAllocation!.available.toLocaleString()}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* Frequency */}
                <FormField
                  control={createForm.control}
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

                {/* Custom Day */}
                {watchFrequency === "CUSTOM" && (
                  <FormField
                    control={createForm.control}
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
                            className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
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
                  control={createForm.control}
                  name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                            {...field}
                          />
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
                  control={createForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                          {...field}
                        />
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
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes about this SIP..."
                          className="resize-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
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
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0 border-t border-gray-200/50 dark:border-gray-700/50 p-6 flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
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
          ) : (
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit(onSubmitEdit)}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto px-6 space-y-6 mt-6">
                {/* Edit Mode: Read-only Information */}
                {sip && (
                  <>
                    <Alert className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                      <InfoIcon className="h-4 w-4" />
                      <AlertTitle>Note</AlertTitle>
                      <AlertDescription>
                        Frequency and start date cannot be changed after creation. If you need to change these,
                        please create a new SIP.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-gray-50/80 to-slate-50/80 dark:from-gray-800/80 dark:to-slate-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                      <div>
                        <p className="text-sm text-muted-foreground">Frequency</p>
                        <p className="font-medium mt-1">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
                            {getDisplayFrequency(sip.frequency, sip.customDay)}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-medium mt-1">{formatDate(sip.startDate)}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Name */}
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Mutual Fund SIP, PPF Investment"
                          className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this SIP
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency Selection - Only for US_STOCK and CRYPTO */}
                {sip?.bucket && (sip.bucket === "US_STOCK" || sip.bucket === "CRYPTO") && (
                  <FormField
                    control={editForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            if (value === "INR") {
                              editForm.setValue("amountInINR", true)
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
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
                {watchCurrency === "USD" && sip?.bucket && (sip.bucket === "US_STOCK" || sip.bucket === "CRYPTO") && (
                  <FormField
                    control={editForm.control}
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
                            <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
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
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => {
                    const isUSDSIP = watchCurrency === "USD" && sip?.bucket && (sip.bucket === "US_STOCK" || sip.bucket === "CRYPTO")
                    const currencySymbol = isUSDSIP && !watchAmountInINR ? "$" : "₹"
                    const currencyLabel = isUSDSIP && !watchAmountInINR ? "USD" : "INR"

                    return (
                      <FormItem>
                        <FormLabel>Amount ({currencyLabel}) *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {currencySymbol}
                            </span>
                            <Input
                              type="number"
                              placeholder={isUSDSIP && !watchAmountInINR ? "100" : "5000"}
                              className="pl-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                              step="0.01"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          The investment amount per installment
                          {isUSDSIP && watchAmountInINR && (
                            <span className="block mt-1 text-blue-600 dark:text-blue-400">
                              This INR amount will be converted to USD at execution time
                            </span>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* End Date */}
                <FormField
                  control={editForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        When should this SIP end? Leave empty for ongoing SIPs
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active Status */}
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/50 backdrop-blur-sm p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active Status
                        </FormLabel>
                        <FormDescription>
                          Toggle to activate or deactivate this SIP
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes about this SIP..."
                          className="resize-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
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
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0 border-t border-gray-200/50 dark:border-gray-700/50 p-6 flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update SIP"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
