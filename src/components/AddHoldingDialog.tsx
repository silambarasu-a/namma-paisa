"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Search, Loader2 } from "lucide-react"

const BUCKETS = [
  { id: "MUTUAL_FUND", label: "Mutual Funds" },
  { id: "IND_STOCK", label: "Indian Stocks" },
  { id: "US_STOCK", label: "US Stocks" },
  { id: "CRYPTO", label: "Cryptocurrency" },
  { id: "EMERGENCY_FUND", label: "Emergency Fund" },
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

interface AddHoldingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddHoldingDialog({ open, onOpenChange, onSuccess }: AddHoldingDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [bucket, setBucket] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [symbol, setSymbol] = useState("")
  const [name, setName] = useState("")
  const [qty, setQty] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [avgCost, setAvgCost] = useState("")
  const [currentPrice, setCurrentPrice] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [isManual, setIsManual] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const initialCurrencySet = useRef(false)
  const qtyInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset all fields
      setBucket("")
      setSearchQuery("")
      setSearchResults([])
      setShowResults(false)
      setSymbol("")
      setName("")
      setQty("")
      setBuyPrice("")
      setAvgCost("")
      setCurrentPrice("")
      setCurrency("INR")
      setIsManual(false)
      setPurchaseDate(new Date().toISOString().split('T')[0])
      initialCurrencySet.current = false
    }
  }, [open])

  // Auto-calculate avgCost from buyPrice and qty for fractional purchases
  useEffect(() => {
    if ((bucket === "CRYPTO" || bucket === "US_STOCK") && buyPrice && qty) {
      const totalPrice = parseFloat(buyPrice)
      const quantity = parseFloat(qty)
      if (!isNaN(totalPrice) && !isNaN(quantity) && quantity > 0) {
        const avgPrice = totalPrice / quantity
        setAvgCost(avgPrice.toFixed(8)) // Use 8 decimals for precision
      }
    } else if ((bucket === "CRYPTO" || bucket === "US_STOCK") && !buyPrice) {
      setAvgCost("")
    }
  }, [buyPrice, qty, bucket])

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

  // Auto-set currency based on bucket
  useEffect(() => {
    if (bucket === "US_STOCK") {
      setCurrency("USD")
    } else {
      setCurrency("INR")
    }
  }, [bucket])

  // Refetch price when currency changes (if we already have a symbol selected)
  useEffect(() => {
    // Skip on initial render
    if (!initialCurrencySet.current) {
      initialCurrencySet.current = true
      return
    }

    const fetchPriceForCurrency = async () => {
      if (symbol && bucket && bucket !== "EMERGENCY_FUND") {
        toast.info(`Fetching price in ${currency}...`)
        try {
          const priceResponse = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}&bucket=${bucket}&currency=${currency}`)
          if (priceResponse.ok) {
            const priceData = await priceResponse.json()
            if (priceData.price) {
              setCurrentPrice(priceData.price.toString())
              toast.success(`Updated price: ${currency === "USD" ? "$" : "₹"}${priceData.price}`)
            } else {
              toast.warning("Could not fetch price in selected currency")
            }
          }
        } catch (error) {
          console.error("Error fetching price for currency:", error)
          toast.warning("Could not fetch price in selected currency")
        }
      }
    }

    fetchPriceForCurrency()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]) // Only trigger when currency changes

  // Search for investments
  useEffect(() => {
    // Don't search if an item is already selected
    if (symbol && name) {
      setSearchResults([])
      return
    }

    if (!bucket || searchQuery.length < 2) {
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

        if (bucket === "MUTUAL_FUND") {
          endpoint = "/api/search/funds"
        } else if (bucket === "IND_STOCK") {
          endpoint = "/api/search/stocks"
          params.append("market", "IN")
        } else if (bucket === "US_STOCK") {
          endpoint = "/api/search/stocks"
          params.append("market", "US")
        } else if (bucket === "CRYPTO") {
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
    }, 300) // Debounce delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, bucket, symbol, name])

  const handleSelectResult = async (result: SearchResult, event?: React.MouseEvent) => {
    event?.preventDefault()
    event?.stopPropagation()

    // For crypto, use 'id' for symbol (coingecko ID), otherwise use symbol
    const selectedSymbol = bucket === "CRYPTO" ? (result.id || result.symbol || "") : (result.symbol || result.id || "")
    setSymbol(selectedSymbol)
    setName(result.name)
    setSearchQuery(result.name)
    setShowResults(false)
    setSearchResults([])

    // Auto-focus to qty input after selection
    setTimeout(() => {
      qtyInputRef.current?.focus()
    }, 100)

    // Auto-fetch current price
    if (bucket && bucket !== "EMERGENCY_FUND") {
      toast.info("Fetching current price...")
      try {
        const priceResponse = await fetch(`/api/price?symbol=${encodeURIComponent(selectedSymbol)}&bucket=${bucket}&currency=${currency}`)
        if (priceResponse.ok) {
          const priceData = await priceResponse.json()
          if (priceData.price) {
            setCurrentPrice(priceData.price.toString())
            toast.success(`Current price: ${currency === "USD" ? "$" : "₹"}${priceData.price}`)
          } else {
            toast.warning("Could not fetch current price. Please enter manually.")
          }
        }
      } catch (error) {
        console.error("Error fetching price:", error)
        toast.warning("Could not fetch current price. Please enter manually.")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // For CRYPTO and US_STOCK, validate buyPrice; for others, validate avgCost
      const priceToValidate = avgCost

      if (!bucket || !symbol || !name || !qty || !priceToValidate) {
        toast.error("Please fill in all required fields")
        setIsLoading(false)
        return
      }

      const body = {
        bucket,
        symbol: symbol.toUpperCase(),
        name,
        qty: parseFloat(qty),
        avgCost: parseFloat(avgCost),
        currentPrice: currentPrice ? parseFloat(currentPrice) : null,
        currency,
        isManual,
        purchaseDate: isManual ? undefined : purchaseDate,
      }

      const response = await fetch("/api/investments/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const result = await response.json()
        // Check if qty was updated (indicates existing holding was updated)
        const isUpdate = result.qty > parseFloat(qty)

        if (isUpdate) {
          toast.success("Holding updated! Quantity and average cost have been recalculated.")
        } else {
          toast.success("New holding added successfully!")
        }

        onOpenChange(false)
        onSuccess?.()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to add holding")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getSearchPlaceholder = () => {
    switch (bucket) {
      case "MUTUAL_FUND":
        return "Search mutual funds... (e.g., ICICI, Axis, HDFC)"
      case "IND_STOCK":
        return "Search Indian stocks... (e.g., Reliance, TCS, HDFC Bank)"
      case "US_STOCK":
        return "Search US stocks... (e.g., Apple, Microsoft, Tesla)"
      case "CRYPTO":
        return "Search crypto... (e.g., Bitcoin, Ethereum, BNB)"
      default:
        return "First select an investment bucket"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Holding</DialogTitle>
          <DialogDescription>
            Add new investments or make additional purchases. If the holding already exists, quantity and average cost will be automatically recalculated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bucket">Investment Bucket *</Label>
              <Select value={bucket} onValueChange={(value) => {
                setBucket(value)
                setSearchQuery("")
                setSymbol("")
                setName("")
                setSearchResults([])
                setBuyPrice("")
                setAvgCost("")
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bucket" />
                </SelectTrigger>
                <SelectContent>
                  {BUCKETS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manual Entry Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-0.5">
              <Label htmlFor="isManual" className="text-base cursor-pointer">
                Manual Entry (No Transaction Tracking)
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable this to add existing holdings without creating a transaction record
              </p>
            </div>
            <Switch
              id="isManual"
              checked={isManual}
              onCheckedChange={setIsManual}
            />
          </div>

          {/* Purchase Date - Only show if not manual */}
          {!isManual && (
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be used to track your investment transactions
              </p>
            </div>
          )}

          {bucket && bucket !== "EMERGENCY_FUND" && (
            <div className="space-y-2" ref={dropdownRef}>
              <Label htmlFor="search">Search Investment *</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Search className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  placeholder={getSearchPlaceholder()}
                  className="pl-10"
                />

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
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
                Start typing to search from our database
              </p>
            </div>
          )}

          {symbol && name && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Selected: {symbol}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {name}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSymbol("")
                    setName("")
                    setSearchQuery("")
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Manual entry for Emergency Fund */}
          {bucket === "EMERGENCY_FUND" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="symbol">Account/Institution *</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g., HDFC Bank, SBI Savings"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Emergency Savings Account"
                  required
                />
              </div>
            </>
          )}

          {/* Quantity and Buy Price/Average Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qty">
                {bucket === "EMERGENCY_FUND" ? "Amount" : "Quantity"} *
              </Label>
              <Input
                id="qty"
                type="number"
                step={bucket === "CRYPTO" ? "0.00000001" : "0.000001"}
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0.00"
                required
                ref={qtyInputRef}
              />
            </div>

            {(bucket === "CRYPTO" || bucket === "US_STOCK") ? (
              <div className="space-y-2">
                <Label htmlFor="buyPrice">
                  Buy Price ({currency === "USD" ? "$" : "₹"}) *
                </Label>
                <Input
                  id="buyPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Price paid for purchased units
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="avgCost">
                  {bucket === "EMERGENCY_FUND" ? "Value" : "Average Cost"} ({currency === "USD" ? "$" : "₹"}) *
                </Label>
                <Input
                  id="avgCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={avgCost}
                  onChange={(e) => setAvgCost(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            )}
          </div>

          {/* Average Cost and Current Price for fractional purchases */}
          {(bucket === "CRYPTO" || bucket === "US_STOCK") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avgCost">
                  Average Cost ({currency === "USD" ? "$" : "₹"})
                </Label>
                <Input
                  id="avgCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={avgCost}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-900"
                  placeholder="Auto-filled from buy price"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated from buy price
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPrice">
                  Current Price ({currency === "USD" ? "$" : "₹"}) (Optional)
                </Label>
                <Input
                  id="currentPrice"
                  type="number"
                  step="any"
                  min="0"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if unknown
                </p>
              </div>
            </div>
          )}

          {/* Current Price for non-fractional purchases */}
          {bucket !== "EMERGENCY_FUND" && bucket !== "CRYPTO" && bucket !== "US_STOCK" && (
            <div className="space-y-2">
              <Label htmlFor="currentPrice">
                Current Price ({currency === "USD" ? "$" : "₹"}) (Optional)
              </Label>
              <Input
                id="currentPrice"
                type="number"
                step="any"
                min="0"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you don&apos;t have the current price yet
              </p>
            </div>
          )}

          <div className="flex space-x-4">
            <Button type="submit" disabled={isLoading || !symbol || !name} className="flex-1">
              {isLoading ? "Processing..." : "Add to Portfolio"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
