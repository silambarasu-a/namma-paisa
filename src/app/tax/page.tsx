"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  netMonthly: number
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
            netMonthly: data[0].netMonthly,
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

    const netMonthly = currentSalary.netMonthly
    let tax = 0

    if (watchedMode === "PERCENTAGE" && watchedPercentage !== undefined) {
      tax = (netMonthly * watchedPercentage) / 100
    } else if (watchedMode === "FIXED" && watchedFixedAmount !== undefined) {
      tax = watchedFixedAmount
    } else if (watchedMode === "HYBRID" && watchedPercentage !== undefined && watchedFixedAmount !== undefined) {
      const percentageTax = (netMonthly * watchedPercentage) / 100
      const fixedTax = watchedFixedAmount
      tax = Math.max(percentageTax, fixedTax)
    }

    return tax
  }

  const monthlyTax = calculateTax()
  const annualTax = monthlyTax * 12
  const netAfterTax = currentSalary ? currentSalary.netMonthly - monthlyTax : 0

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
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">
              No Salary Information
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Please set your net salary in the Profile section before configuring tax settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Tax Settings</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Tax Calculation Mode</CardTitle>
              <CardDescription>
                Choose how you want to calculate your tax deductions
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                          Percentage of Net Salary
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Calculate tax as a percentage of your monthly net salary. Ideal for proportional deductions.
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
                      Enter the percentage of your net salary to be deducted as tax (0-100)
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
                          With net salary of <span className="font-semibold">₹{currentSalary.netMonthly.toLocaleString()}</span>,
                          your tax will be <span className="font-semibold">₹{monthlyTax.toLocaleString()}</span>,
                          leaving <span className="font-semibold">₹{netAfterTax.toLocaleString()}</span> after tax.
                        </p>
                        {watchedMode === "HYBRID" && watchedPercentage !== undefined && watchedFixedAmount !== undefined && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            Percentage: ₹{((currentSalary.netMonthly * watchedPercentage) / 100).toLocaleString()} |
                            Fixed: ₹{watchedFixedAmount.toLocaleString()} |
                            Using: ₹{Math.max((currentSalary.netMonthly * watchedPercentage) / 100, watchedFixedAmount).toLocaleString()} (higher)
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections">
          <div className="space-y-6">
            {currentSalary && (
              <>
                {/* Current Settings Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Tax Configuration</CardTitle>
                    <CardDescription>Your active tax settings</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                {/* Monthly Projections */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Tax</CardTitle>
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{monthlyTax.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        {currentSalary && monthlyTax > 0 ?
                          `${((monthlyTax / currentSalary.netMonthly) * 100).toFixed(1)}% of net salary` :
                          "Tax not configured"
                        }
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Annual Tax</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{annualTax.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Yearly tax projection
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net After Tax</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{netAfterTax.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Available for investments & expenses
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tax Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Breakdown</CardTitle>
                    <CardDescription>
                      Detailed view of your tax calculations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div>
                          <h3 className="font-medium">Net Monthly Salary</h3>
                          <p className="text-sm text-muted-foreground">Base amount</p>
                        </div>
                        <div className="text-lg font-bold">₹{currentSalary.netMonthly.toLocaleString()}</div>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="w-px h-8 bg-border"></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div>
                          <h3 className="font-medium">Tax Deduction</h3>
                          <p className="text-sm text-muted-foreground">
                            {taxSetting?.mode === "PERCENTAGE" && `${taxSetting.percentage}% of net salary`}
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
                  </CardContent>
                </Card>
              </>
            )}

            {!currentSalary && (
              <Card>
                <CardContent className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Salary Data</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Set up your net salary in the Profile section to view tax projections.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}