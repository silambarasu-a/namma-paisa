"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Settings, Save } from "lucide-react"

const BUCKETS = [
  { id: "MUTUAL_FUND", label: "Mutual Funds" },
  { id: "IND_STOCK", label: "Indian Stocks" },
  { id: "US_STOCK", label: "US Stocks" },
  { id: "CRYPTO", label: "Cryptocurrency" },
  { id: "EMERGENCY_FUND", label: "Emergency Fund" },
]

interface Allocation {
  bucket: string
  percent: number
}

export default function AllocationsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [allocations, setAllocations] = useState<Record<string, number>>({
    MUTUAL_FUND: 0,
    IND_STOCK: 0,
    US_STOCK: 0,
    CRYPTO: 0,
    EMERGENCY_FUND: 0,
  })

  useEffect(() => {
    loadAllocations()
  }, [])

  const loadAllocations = async () => {
    try {
      const response = await fetch("/api/investments/allocations")
      if (response.ok) {
        const data: Allocation[] = await response.json()
        const allocMap: Record<string, number> = { ...allocations }
        data.forEach((alloc) => {
          allocMap[alloc.bucket] = Number(alloc.percent)
        })
        setAllocations(allocMap)
      }
    } catch (error) {
      toast.error("Failed to load allocations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (bucket: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setAllocations((prev) => ({ ...prev, [bucket]: numValue }))
  }

  const getTotalPercent = () => {
    return Object.values(allocations).reduce((sum, val) => sum + val, 0)
  }

  const handleSave = async () => {
    const total = getTotalPercent()
    if (total > 100) {
      toast.error("Total allocation cannot exceed 100%")
      return
    }

    setIsSaving(true)
    try {
      const allocationData = Object.entries(allocations)
        .filter(([_, percent]) => percent > 0)
        .map(([bucket, percent]) => ({ bucket, percent }))

      const response = await fetch("/api/investments/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations: allocationData }),
      })

      if (response.ok) {
        toast.success("Allocations saved successfully")
        router.push("/investments")
      } else {
        const data = await response.json()
        toast.error(data.message || "Failed to save allocations")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const total = getTotalPercent()
  const remaining = 100 - total

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Investment Allocations
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure how you want to allocate your investment budget across different buckets
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Allocation Percentages</span>
          </CardTitle>
          <CardDescription>
            Specify what percentage of your available investment amount goes to each bucket.
            Total must not exceed 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {BUCKETS.map((bucket) => (
            <div key={bucket.id} className="space-y-2">
              <Label htmlFor={bucket.id}>{bucket.label}</Label>
              <div className="flex items-center space-x-4">
                <Input
                  id={bucket.id}
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={allocations[bucket.id]}
                  onChange={(e) => handleChange(bucket.id, e.target.value)}
                  className="max-w-[150px]"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${allocations[bucket.id]}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Total Allocated:</span>
              <span className={`text-xl font-bold ${total > 100 ? "text-red-600" : "text-green-600"}`}>
                {total.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining:</span>
              <span className="text-sm text-muted-foreground">{remaining.toFixed(1)}%</span>
            </div>
            {total > 100 && (
              <p className="text-sm text-red-600 mt-2">
                Total allocation exceeds 100%. Please adjust the percentages.
              </p>
            )}
          </div>

          <div className="flex space-x-4">
            <Button onClick={handleSave} disabled={isSaving || total > 100} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Allocations"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/investments")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}