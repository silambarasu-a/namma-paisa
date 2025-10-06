"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Calculator, TrendingUp, DollarSign, Percent, AlertCircle, Info } from "lucide-react"

interface TaxSetting {
  id: string
  mode: "PERCENTAGE" | "FIXED" | "HYBRID"
  percentage?: number
  fixedAmount?: number
  createdAt: string
  updatedAt: string
}

interface SalaryInfo {
  monthly: number
  effectiveFrom: string
}

// Zod schema for tax settings form
const taxFormSchema = z
  .object({
    mode: z.enum(["PERCENTAGE", "FIXED", "HYBRID"]),
    percentage: z.union([z.number().min(0, "Must be at least 0").max(100, "Must be at most 100"), z.nan()]).optional(),
    fixedAmount: z.union([z.number().min(0, "Must be at least 0"), z.nan()]).optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "PERCENTAGE") {
        return data.percentage !== undefined && !isNaN(data.percentage as number);
      }
      if (data.mode === "FIXED") {
        return data.fixedAmount !== undefined && !isNaN(data.fixedAmount as number);
      }
      if (data.mode === "HYBRID") {
        return data.percentage !== undefined && !isNaN(data.percentage as number) &&
               data.fixedAmount !== undefined && !isNaN(data.fixedAmount as number);
      }
      return true
    },
    {
      message: "Please fill in all required fields for the selected mode",
      path: ["mode"],
    }
  )

type TaxFormValues = z.infer<typeof taxFormSchema>

export default function TaxConfiguration() {
  const [isLoading, setIsLoading] = useState(false)
  const [taxSetting, setTaxSetting] = useState<TaxSetting | null>(null)
  const [currentSalary, setCurrentSalary] = useState<SalaryInfo | null>(null)

  // React Hook Form with Zod validation
  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxFormSchema),
    defaultValues: {
      mode: "PERCENTAGE",
      percentage: undefined,
      fixedAmount: undefined,
    },
  })

  const watchedMode = form.watch("mode")
  const watchedPercentage = form.watch("percentage")
  const watchedFixedAmount = form.watch("fixedAmount")

  useEffect(() => {
    fetchTaxSettings()
    fetchCurrentSalary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTaxSettings = async () => {
    try {
      const response = await fetch("/api/tax")
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setTaxSetting(data)
          form.reset({
            mode: data.mode,
            percentage: data.percentage || undefined,
            fixedAmount: data.fixedAmount || undefined,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch tax settings:", error)
      toast.error("Failed to load tax settings")
    }
  }

  const fetchCurrentSalary = async () => {
    try {
      const response = await fetch("/api/profile/salary-history")
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          setCurrentSalary({
            monthly: data[0].monthly,
            effectiveFrom: data[0].effectiveFrom,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch salary:", error)
    }
  }

  const onSubmit = async (data: TaxFormValues) => {
    setIsLoading(true)

    try {
      // Validate required fields based on mode
      if (data.mode === "PERCENTAGE" && (data.percentage === undefined || isNaN(data.percentage))) {
        toast.error("Please enter a valid percentage value")
        setIsLoading(false)
        return
      }

      if (data.mode === "FIXED" && (data.fixedAmount === undefined || isNaN(data.fixedAmount))) {
        toast.error("Please enter a valid fixed amount")
        setIsLoading(false)
        return
      }

      if (data.mode === "HYBRID") {
        if (data.percentage === undefined || isNaN(data.percentage)) {
          toast.error("Please enter a valid percentage value")
          setIsLoading(false)
          return
        }
        if (data.fixedAmount === undefined || isNaN(data.fixedAmount)) {
          toast.error("Please enter a valid fixed amount")
          setIsLoading(false)
          return
        }
      }

      const body: {
        mode: "PERCENTAGE" | "FIXED" | "HYBRID";
        percentage?: number;
        fixedAmount?: number;
      } = { mode: data.mode }

      if (data.mode === "PERCENTAGE" || data.mode === "HYBRID") {
        body.percentage = data.percentage
      }

      if (data.mode === "FIXED" || data.mode === "HYBRID") {
        body.fixedAmount = data.fixedAmount
      }

      const response = await fetch("/api/tax", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success("Tax settings updated successfully!")
        await fetchTaxSettings()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update tax settings")
      }
    } catch (error) {
      console.error("Error updating tax settings:", error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTax = () => {
    if (!currentSalary) return 0

    const monthlySalary = currentSalary.monthly
    let tax = 0

    if (watchedMode === "PERCENTAGE" && watchedPercentage !== undefined) {
      tax = (monthlySalary * watchedPercentage) / 100
    } else if (watchedMode === "FIXED" && watchedFixedAmount !== undefined) {
      tax = watchedFixedAmount
    } else if (watchedMode === "HYBRID" && watchedPercentage !== undefined && watchedFixedAmount !== undefined) {
      const percentageTax = (monthlySalary * watchedPercentage) / 100
      const fixedTax = watchedFixedAmount
      tax = Math.max(percentageTax, fixedTax)
    }

    return tax
  }

  const monthlyTax = calculateTax()
  const annualTax = monthlyTax * 12
  const netAfterTax = currentSalary ? currentSalary.monthly - monthlyTax : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tax Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your tax calculations and view projections
        </p>
      </div>

      {!currentSalary && (
        <div className="relative overflow-hidden rounded-xl bg-yellow-50/80 dark:bg-yellow-900/20 backdrop-blur-lg border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5 pointer-events-none"></div>
          <div className="relative p-6">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              No Salary Information
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Please set your monthly salary in the Profile section before configuring tax settings.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Tax Settings</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 border-l-4 border-l-orange-500">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
            <div className="relative p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tax Calculation Mode
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Choose how you want to calculate your tax deductions
              </p>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Tax Mode Selection with Radio Buttons */}
                <div className="space-y-4">
                  <Label>Tax Mode</Label>
                  <RadioGroup
                    value={watchedMode}
                    onValueChange={(value) => form.setValue("mode", value as "PERCENTAGE" | "FIXED" | "HYBRID")}
                  >
                    {/* Percentage Mode */}
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <RadioGroupItem value="PERCENTAGE" id="percentage-mode" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="percentage-mode" className="font-medium cursor-pointer">
                          Percentage of monthly salary
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Calculate tax as a percentage of your monthly monthly salary. Ideal for proportional deductions.
                        </p>
                      </div>
                      <Percent className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Fixed Mode */}
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <RadioGroupItem value="FIXED" id="fixed-mode" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="fixed-mode" className="font-medium cursor-pointer">
                          Fixed Amount
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Set a fixed monthly tax amount. Best when you know your exact monthly tax liability.
                        </p>
                      </div>
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Hybrid Mode */}
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <RadioGroupItem value="HYBRID" id="hybrid-mode" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="hybrid-mode" className="font-medium cursor-pointer">
                          Hybrid (Higher of Both)
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          System calculates both percentage and fixed amount, then applies whichever is higher. Ensures minimum tax coverage.
                        </p>
                      </div>
                      <Calculator className="h-5 w-5 text-gray-400" />
                    </div>
                  </RadioGroup>
                  {form.formState.errors.mode && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {form.formState.errors.mode.message}
                    </p>
                  )}
                </div>

                {/* Conditional Input Fields */}
                {(watchedMode === "PERCENTAGE" || watchedMode === "HYBRID") && (
                  <div className="space-y-2">
                    <Label htmlFor="percentage">Tax Percentage (%)</Label>
                    <Input
                      id="percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="30.00"
                      {...form.register("percentage", { valueAsNumber: true })}
                    />
                    {form.formState.errors.percentage && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {form.formState.errors.percentage.message}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enter the percentage of your monthly salary to be deducted as tax (0-100)
                    </p>
                  </div>
                )}

                {(watchedMode === "FIXED" || watchedMode === "HYBRID") && (
                  <div className="space-y-2">
                    <Label htmlFor="fixedAmount">Fixed Tax Amount (₹)</Label>
                    <Input
                      id="fixedAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="25000"
                      {...form.register("fixedAmount", { valueAsNumber: true })}
                    />
                    {form.formState.errors.fixedAmount && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {form.formState.errors.fixedAmount.message}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enter a fixed monthly tax amount in rupees
                    </p>
                  </div>
                )}

                {/* Real-time Calculation Preview */}
                {currentSalary && (watchedPercentage !== undefined || watchedFixedAmount !== undefined) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Real-time Calculation Preview
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          With monthly salary of <span className="font-semibold">₹{currentSalary.monthly.toLocaleString()}</span>,
                          your tax will be <span className="font-semibold">₹{monthlyTax.toLocaleString()}</span>,
                          leaving <span className="font-semibold">₹{netAfterTax.toLocaleString()}</span> after tax.
                        </p>
                        {watchedMode === "HYBRID" && watchedPercentage !== undefined && watchedFixedAmount !== undefined && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            Percentage: ₹{((currentSalary.monthly * watchedPercentage) / 100).toLocaleString()} |
                            Fixed: ₹{watchedFixedAmount.toLocaleString()} |
                            Using: ₹{Math.max((currentSalary.monthly * watchedPercentage) / 100, watchedFixedAmount).toLocaleString()} (higher)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isLoading || !currentSalary} className="w-full">
                  {isLoading ? "Updating..." : "Update Tax Settings"}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projections">
          <div className="space-y-6">
            {currentSalary && (
              <>
                {/* Current Settings Summary */}
                <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 border-l-4 border-l-blue-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
                  <div className="relative p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Current Tax Configuration
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Your active tax settings
                    </p>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="text-sm">
                        {taxSetting?.mode || "Not configured"}
                      </Badge>
                      {taxSetting?.percentage && (
                        <div className="flex items-center space-x-1">
                          <Percent className="h-4 w-4" />
                          <span>{taxSetting.percentage}%</span>
                        </div>
                      )}
                      {taxSetting?.fixedAmount && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>₹{taxSetting.fixedAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Monthly Projections */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-red-50/90 to-red-100/70 dark:from-red-900/30 dark:to-red-800/20 backdrop-blur-sm rounded-xl border-2 border-red-200 dark:border-red-700 hover:shadow-lg transition-all">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Monthly Tax</h3>
                      <Calculator className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="pt-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">₹{monthlyTax.toLocaleString()}</div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {currentSalary && monthlyTax > 0 ?
                          `${((monthlyTax / currentSalary.monthly) * 100).toFixed(1)}% of monthly salary` :
                          "Tax not configured"
                        }
                      </p>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-50/90 to-purple-100/70 dark:from-purple-900/30 dark:to-purple-800/20 backdrop-blur-sm rounded-xl border-2 border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Annual Tax</h3>
                      <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="pt-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">₹{annualTax.toLocaleString()}</div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Yearly tax projection
                      </p>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50/90 to-green-100/70 dark:from-green-900/30 dark:to-green-800/20 backdrop-blur-sm rounded-xl border-2 border-green-200 dark:border-green-700 hover:shadow-lg transition-all">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Net After Tax</h3>
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="pt-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">₹{netAfterTax.toLocaleString()}</div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Available for investments & expenses
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tax Breakdown */}
                <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 border-l-4 border-l-purple-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
                  <div className="relative p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Tax Breakdown
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Detailed view of your tax calculations
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div>
                          <h3 className="font-medium">Monthly Salary</h3>
                          <p className="text-sm text-muted-foreground">Base amount</p>
                        </div>
                        <div className="text-lg font-bold">₹{currentSalary.monthly.toLocaleString()}</div>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="w-px h-8 bg-border"></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div>
                          <h3 className="font-medium">Tax Deduction</h3>
                          <p className="text-sm text-muted-foreground">
                            {taxSetting?.mode === "PERCENTAGE" && `${taxSetting.percentage}% of monthly salary`}
                            {taxSetting?.mode === "FIXED" && "Fixed amount"}
                            {taxSetting?.mode === "HYBRID" && "Higher of percentage or fixed"}
                          </p>
                        </div>
                        <div className="text-lg font-bold">-₹{monthlyTax.toLocaleString()}</div>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="w-px h-8 bg-border"></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div>
                          <h3 className="font-medium">Amount After Tax</h3>
                          <p className="text-sm text-muted-foreground">Available for allocation</p>
                        </div>
                        <div className="text-lg font-bold">₹{netAfterTax.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!currentSalary && (
              <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
                <div className="relative text-center py-8 px-6">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">No Salary Data</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Set up your monthly salary in the Profile section to view tax projections.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}