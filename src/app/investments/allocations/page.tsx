"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Settings, Save, Percent, DollarSign, Info } from "lucide-react"
import type { InvestmentAllocation } from "@/types"
import { INVESTMENT_BUCKETS } from "@/constants"

type Allocation = InvestmentAllocation

interface AllocationState {
  type: "PERCENTAGE" | "AMOUNT"
  value: number
  enabled: boolean
}

export default function AllocationsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [allocations, setAllocations] = useState<Record<string, AllocationState>>({
    MUTUAL_FUND: { type: "PERCENTAGE", value: 0, enabled: false },
    IND_STOCK: { type: "PERCENTAGE", value: 0, enabled: false },
    US_STOCK: { type: "PERCENTAGE", value: 0, enabled: false },
    CRYPTO: { type: "PERCENTAGE", value: 0, enabled: false },
    EMERGENCY_FUND: { type: "PERCENTAGE", value: 0, enabled: false },
  })

  useEffect(() => {
    loadAllocations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAllocations = async () => {
    try {
      const response = await fetch("/api/investments/allocations")
      if (response.ok) {
        const data: Allocation[] = await response.json()
        const allocMap: Record<string, AllocationState> = { ...allocations }

        data.forEach((alloc) => {
          allocMap[alloc.bucket] = {
            type: alloc.allocationType,
            value: alloc.allocationType === "PERCENTAGE"
              ? Number(alloc.percent || 0)
              : Number(alloc.customAmount || 0),
            enabled: true,
          }
        })

        setAllocations(allocMap)
      }
    } catch {
      toast.error("Failed to load allocations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTypeChange = (bucket: string, type: "PERCENTAGE" | "AMOUNT") => {
    setAllocations((prev) => ({
      ...prev,
      [bucket]: { ...prev[bucket], type, value: 0 },
    }))
  }

  const handleValueChange = (bucket: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setAllocations((prev) => ({
      ...prev,
      [bucket]: { ...prev[bucket], value: numValue },
    }))
  }

  const handleToggle = (bucket: string, enabled: boolean) => {
    setAllocations((prev) => ({
      ...prev,
      [bucket]: { ...prev[bucket], enabled },
    }))
  }

  const getTotalPercent = () => {
    return Object.values(allocations)
      .filter(a => a.enabled && a.type === "PERCENTAGE")
      .reduce((sum, val) => sum + val.value, 0)
  }

  const getTotalAmount = () => {
    return Object.values(allocations)
      .filter(a => a.enabled && a.type === "AMOUNT")
      .reduce((sum, val) => sum + val.value, 0)
  }

  const handleSave = async () => {
    const totalPercent = getTotalPercent()
    if (totalPercent > 100) {
      toast.error("Total percentage allocation cannot exceed 100%")
      return
    }

    const enabledAllocations = Object.entries(allocations)
      .filter(([, alloc]) => alloc.enabled && alloc.value > 0)

    if (enabledAllocations.length === 0) {
      toast.error("Please enable and set at least one allocation")
      return
    }

    setIsSaving(true)
    try {
      const allocationData = enabledAllocations.map(([bucket, alloc]) => ({
        bucket,
        allocationType: alloc.type,
        percent: alloc.type === "PERCENTAGE" ? alloc.value : undefined,
        customAmount: alloc.type === "AMOUNT" ? alloc.value : undefined,
      }))

      const response = await fetch("/api/investments/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allocationData),
      })

      if (response.ok) {
        toast.success("Allocations saved successfully")
        router.push("/investments")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to save allocations")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const totalPercent = getTotalPercent()
  const totalAmount = getTotalAmount()
  const remainingPercent = 100 - totalPercent

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
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Investment Allocations
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Configure how you want to allocate your investment budget across different asset classes
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-1">How allocations work:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Percentage:</strong> Allocate a % of your available investment amount</li>
                <li><strong>Custom Amount:</strong> Allocate a fixed amount regardless of available balance</li>
                <li>You can mix both types for different buckets</li>
                <li>Total percentage allocations cannot exceed 100%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configure Allocations</span>
          </CardTitle>
          <CardDescription>
            Enable and configure each investment bucket individually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {INVESTMENT_BUCKETS.map((bucket) => {
            const alloc = allocations[bucket.id]
            return (
              <div
                key={bucket.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  alloc.enabled
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${bucket.color}`} />
                    <Label htmlFor={`enable-${bucket.id}`} className="text-base font-semibold cursor-pointer">
                      {bucket.label}
                    </Label>
                    {alloc.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        {alloc.type === "PERCENTAGE" ? "Percentage" : "Fixed Amount"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`enable-${bucket.id}`}
                      checked={alloc.enabled}
                      onChange={(e) => handleToggle(bucket.id, e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {alloc.enabled && (
                  <div className="space-y-4 pl-6">
                    {/* Type Selector */}
                    <RadioGroup
                      value={alloc.type}
                      onValueChange={(value) => handleTypeChange(bucket.id, value as "PERCENTAGE" | "AMOUNT")}
                      className="flex flex-col gap-3 sm:flex-row sm:gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="PERCENTAGE" id={`${bucket.id}-percent`} />
                        <Label htmlFor={`${bucket.id}-percent`} className="flex items-center gap-1 cursor-pointer text-sm sm:text-base">
                          <Percent className="h-4 w-4 flex-shrink-0" />
                          <span>Percentage</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="AMOUNT" id={`${bucket.id}-amount`} />
                        <Label htmlFor={`${bucket.id}-amount`} className="flex items-center gap-1 cursor-pointer text-sm sm:text-base">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          <span>Custom Amount</span>
                        </Label>
                      </div>
                    </RadioGroup>

                    {/* Value Input */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-full sm:w-auto sm:min-w-[120px]">
                          <Input
                            type="number"
                            step={alloc.type === "PERCENTAGE" ? "0.1" : "100"}
                            min="0"
                            max={alloc.type === "PERCENTAGE" ? "100" : undefined}
                            value={alloc.value}
                            onChange={(e) => handleValueChange(bucket.id, e.target.value)}
                            placeholder={alloc.type === "PERCENTAGE" ? "0.0" : "0"}
                            className="text-base sm:text-lg"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {alloc.type === "PERCENTAGE" ? "%" : "₹"}
                        </span>
                      </div>

                      {/* Progress bar for percentage */}
                      {alloc.type === "PERCENTAGE" && (
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={bucket.color}
                              style={{ width: `${Math.min(alloc.value, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Summary */}
          <div className="pt-6 border-t space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Percentage Summary */}
              {totalPercent > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total Percentage Allocated:</span>
                    <span className={`text-xl font-bold ${totalPercent > 100 ? "text-red-600" : "text-blue-600"}`}>
                      {totalPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Remaining:</span>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {remainingPercent.toFixed(1)}%
                    </span>
                  </div>
                  {totalPercent > 100 && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ Total exceeds 100%. Please adjust the percentages.
                    </p>
                  )}
                </div>
              )}

              {/* Amount Summary */}
              {totalAmount > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Custom Amount:</span>
                    <span className="text-xl font-bold text-green-600">
                      ₹{totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will be deducted first from available investment amount
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || totalPercent > 100}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Allocations"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/investments")}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
