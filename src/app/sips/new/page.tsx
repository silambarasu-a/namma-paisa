"use client"

import { useState } from "react"
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
import { ArrowLeft, Loader2 } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const sipFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  frequency: z.enum(["MONTHLY", "YEARLY", "CUSTOM"]),
  customDay: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  description: z.string().max(500, "Description too long").optional(),
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

export default function NewSIPPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SIPFormData>({
    resolver: zodResolver(sipFormSchema),
    defaultValues: {
      name: "",
      amount: "",
      frequency: "MONTHLY",
      customDay: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  })

  const watchFrequency = form.watch("frequency")

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
      router.push("/sips")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create SIP")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/sips")}
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
            Enter the details of your systematic investment plan. All fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
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

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          placeholder="5000"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The investment amount per installment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
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
                  onClick={() => router.push("/sips")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
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