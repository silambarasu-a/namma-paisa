"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { PlusCircle } from "lucide-react"

const BUCKETS = [
  { id: "MUTUAL_FUND", label: "Mutual Funds" },
  { id: "IND_STOCK", label: "Indian Stocks" },
  { id: "US_STOCK", label: "US Stocks" },
  { id: "CRYPTO", label: "Cryptocurrency" },
  { id: "EMERGENCY_FUND", label: "Emergency Fund" },
]

export default function NewHoldingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [bucket, setBucket] = useState("")
  const [symbol, setSymbol] = useState("")
  const [name, setName] = useState("")
  const [qty, setQty] = useState("")
  const [avgCost, setAvgCost] = useState("")
  const [currentPrice, setCurrentPrice] = useState("")
  const [currency, setCurrency] = useState("INR")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!bucket || !symbol || !name || !qty || !avgCost) {
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
      }

      const response = await fetch("/api/investments/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success("Holding added successfully")
        router.push(`/investments/holdings?bucket=${bucket}`)
      } else {
        const data = await response.json()
        toast.error(data.message || "Failed to add holding")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add New Holding
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Record a new investment in your portfolio
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PlusCircle className="h-5 w-5" />
            <span>Holding Details</span>
          </CardTitle>
          <CardDescription>
            Enter the details of your investment holding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bucket">Investment Bucket *</Label>
              <Select value={bucket} onValueChange={setBucket}>
                <SelectTrigger>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g., RELIANCE, BTC, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Reliance Industries Ltd."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity *</Label>
                <Input
                  id="qty"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avgCost">Average Cost ({currency === "USD" ? "$" : "₹"}) *</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPrice">
                Current Price ({currency === "USD" ? "$" : "₹"}) (Optional)
              </Label>
              <Input
                id="currentPrice"
                type="number"
                step="0.01"
                min="0"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you don&apos;t have the current price yet
              </p>
            </div>

            <div className="flex space-x-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Adding..." : "Add Holding"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/investments/holdings")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}