"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import { getFrequencyLabel } from "@/lib/frequency-utils"
import type { SIPFrequency } from "@/types/investment"
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

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

type SIPEditData = z.infer<typeof sipEditSchema>

interface SIP {
  id: string
  name: string
  amount: number
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM"
  customDay?: number | null
  startDate: string
  endDate?: string | null
  isActive: boolean
  description?: string | null
  bucket?: string | null
  currency?: string
  amountInINR?: boolean
}

export default function EditSIPPage() {
  const router = useRouter()
  const params = useParams()
  const sipId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sip, setSip] = useState<SIP | null>(null)

  const form = useForm<SIPEditData>({
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

  useEffect(() => {
    const fetchSIP = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/sips")
        if (!response.ok) throw new Error("Failed to fetch SIPs")
        const sips = await response.json()
        const foundSip = sips.find((s: SIP) => s.id === sipId)

        if (!foundSip) {
          toast.error("SIP not found")
          router.push("/investments/sips")
          return
        }

        setSip(foundSip)
        form.reset({
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
        router.push("/investments/sips")
      } finally {
        setIsLoading(false)
      }
    }

    if (sipId) {
      fetchSIP()
    }
  }, [sipId, router, form])

  const onSubmit = async (data: SIPEditData) => {
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
      router.push("/investments/sips")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update SIP")
      console.error(error)
    } finally {
      setIsSubmitting(false)
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

  if (isLoading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
          <h1 className="text-3xl font-bold text-white">Edit SIP</h1>
          <p className="text-blue-100 dark:text-blue-200 mt-2">
            Loading SIP details...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!sip) {
    return null
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
            <h1 className="text-3xl font-bold text-white">Edit SIP</h1>
            <p className="text-blue-100 dark:text-blue-200 mt-2">
              Update your systematic investment plan
            </p>
          </div>
        </div>
      </div>

      <Card className="max-w-3xl mx-auto shadow-lg -mt-12">
        <CardHeader>
          <CardTitle>SIP Details</CardTitle>
          <CardDescription>
            Edit the details of your systematic investment plan. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Read-only Information */}
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              Frequency and start date cannot be changed after creation. If you need to change these,
              please create a new SIP.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Frequency</p>
              <p className="font-medium mt-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {getDisplayFrequency(sip.frequency, sip.customDay)}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium mt-1">{formatDate(sip.startDate)}</p>
            </div>
          </div>

          {/* Editable Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mutual Fund SIP, PPF Investment" {...field} />
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
              {form.watch("currency") === "USD" && sip?.bucket && (sip.bucket === "US_STOCK" || sip.bucket === "CRYPTO") && (
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
                  const watchCurrency = form.watch("currency")
                  const watchAmountInINR = form.watch("amountInINR")
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
                            className="pl-8"
                            {...field}
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
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )
                }}
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

              {/* Active Status */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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
                <Button type="submit" disabled={isSubmitting} className="flex-1">
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
        </CardContent>
      </Card>
    </div>
  )
}