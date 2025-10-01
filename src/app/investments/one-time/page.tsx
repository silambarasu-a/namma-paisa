"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, TrendingUp, AlertCircle } from "lucide-react"
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
  { id: "MUTUAL_FUND", label: "Mutual Funds", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { id: "IND_STOCK", label: "Indian Stocks", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { id: "US_STOCK", label: "US Stocks", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { id: "CRYPTO", label: "Cryptocurrency", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
]

interface BucketAllocation {
  bucket: string
  totalAllocation: number
  existingSIPs: number
  availableForOneTime: number
}

const purchaseSchema = z.object({
  bucket: z.string().min(1, "Please select an investment bucket"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  date: z.string().min(1, "Date is required"),
  description: z.string().max(500, "Description too long").optional(),
})

type PurchaseFormData = z.infer<typeof purchaseSchema>

export default function OneTimePurchasePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(true)
  const [bucketAllocations, setBucketAllocations] = useState<BucketAllocation[]>([])

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      bucket: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
    },
  })

  const watchBucket = form.watch("bucket")
  const watchAmount = form.watch("amount")

  // Load bucket allocations
  useEffect(() => {
    loadAllocations()
  }, [])

  const loadAllocations = async () => {
    try {
      setIsLoadingAllocations(true)
      const response = await fetch("/api/investments/one-time/allocations")
      if (response.ok) {
        const data = await response.json()
        setBucketAllocations(data)
      } else {
        toast.error("Failed to load allocation data")
      }
    } catch (error) {
      console.error("Error loading allocations:", error)
      toast.error("Failed to load allocation data")
    } finally {
      setIsLoadingAllocations(false)
    }
  }

  const selectedBucketAllocation = bucketAllocations.find(b => b.bucket === watchBucket)
  const amount = Number(watchAmount) || 0
  const exceedsLimit = selectedBucketAllocation && amount > selectedBucketAllocation.availableForOneTime

  const onSubmit = async (data: PurchaseFormData) => {
    try {
      setIsSubmitting(true)

      const response = await fetch("/api/investments/one-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: data.bucket,
          amount: Number(data.amount),
          date: data.date,
          description: data.description,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to record purchase")
      }

      toast.success("One-time purchase recorded successfully")
      router.push("/investments")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record purchase")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-900 dark:to-emerald-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/investments")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">One-Time Investment</h1>
            <p className="text-green-100 dark:text-green-200 mt-2">
              Record a one-time investment purchase for this month
            </p>
          </div>
        </div>
      </div>

      {/* Allocation Overview */}
      {isLoadingAllocations ? (
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : bucketAllocations.length === 0 ? (
        <Card className="max-w-4xl mx-auto border-orange-200 dark:border-orange-800">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  No Allocations Configured
                </h3>
                <p className="text-orange-800 dark:text-orange-200">
                  Please configure your investment allocations first before making one-time purchases.
                </p>
                <Button
                  onClick={() => router.push("/investments/allocations")}
                  className="mt-4"
                >
                  Configure Allocations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Available Allocations */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                Available for One-Time Investment
              </CardTitle>
              <CardDescription>
                Amount available after deducting SIPs from allocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bucketAllocations.map((allocation) => (
                  <div
                    key={allocation.bucket}
                    className={`p-4 rounded-lg border-2 ${
                      watchBucket === allocation.bucket
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        {BUCKETS.find(b => b.id === allocation.bucket)?.label}
                      </span>
                      <Badge className={BUCKETS.find(b => b.id === allocation.bucket)?.color}>
                        Available
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Allocation:</span>
                        <span className="font-medium">₹{allocation.totalAllocation.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SIPs:</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          -₹{allocation.existingSIPs.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span className="font-medium">Available:</span>
                        <span className={`font-bold text-lg ${
                          allocation.availableForOneTime > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ₹{allocation.availableForOneTime.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Purchase Form */}
          <Card className="max-w-4xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle>Record Purchase</CardTitle>
              <CardDescription>
                Enter details of your one-time investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Bucket Selection */}
                  <FormField
                    control={form.control}
                    name="bucket"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Bucket *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bucket" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bucketAllocations.map((allocation) => (
                              <SelectItem
                                key={allocation.bucket}
                                value={allocation.bucket}
                                disabled={allocation.availableForOneTime <= 0}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{BUCKETS.find(b => b.id === allocation.bucket)?.label}</span>
                                  <span className="ml-4 text-xs text-muted-foreground">
                                    ₹{allocation.availableForOneTime.toLocaleString()} available
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Amount */}
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Amount *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              ₹
                            </span>
                            <Input
                              type="number"
                              placeholder="10000"
                              className={`pl-8 ${exceedsLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                              step="0.01"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Amount to invest in this bucket for this month
                        </FormDescription>
                        {exceedsLimit && (
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            ⚠️ Amount exceeds available allocation of ₹{selectedBucketAllocation.availableForOneTime.toLocaleString()}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          Date when the investment was made
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
                          <Input
                            placeholder="e.g., Monthly lumpsum investment"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Additional notes about this investment
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
                      onClick={() => router.push("/investments")}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || exceedsLimit || !watchBucket}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recording...
                        </>
                      ) : exceedsLimit ? (
                        "Amount Exceeds Limit"
                      ) : !watchBucket ? (
                        "Select Bucket First"
                      ) : (
                        "Record Purchase"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
