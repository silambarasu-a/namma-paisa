"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Wallet, Settings, PlusCircle, Eye, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface AllocationData {
  id: string
  bucket: string
  percent: number
}

interface CalculateData {
  grossIncome: number
  taxAmount: number
  taxPercentage: number
  afterTax: number
  sipCount: number
  totalSIPAmount: number
  afterSIPs: number
  loanCount: number
  totalLoanEMI: number
  afterLoans: number
  availableForInvestment: number
}

const BUCKET_LABELS: Record<string, string> = {
  MUTUAL_FUND: "Mutual Funds",
  IND_STOCK: "Indian Stocks",
  US_STOCK: "US Stocks",
  CRYPTO: "Cryptocurrency",
  EMERGENCY_FUND: "Emergency Fund",
}

const BUCKET_COLORS: Record<string, string> = {
  MUTUAL_FUND: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IND_STOCK: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  US_STOCK: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  CRYPTO: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  EMERGENCY_FUND: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default function InvestmentsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [allocations, setAllocations] = useState<AllocationData[]>([])
  const [calculateData, setCalculateData] = useState<CalculateData | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch current salary from salary history (most recent entry)
      const profileResponse = await fetch("/api/profile/salary-history")
      let netSalary = 0
      if (profileResponse.ok) {
        const salaryHistory = await profileResponse.json()
        if (salaryHistory && salaryHistory.length > 0) {
          netSalary = Number(salaryHistory[0].netMonthly)
        }
      }

      // Fetch allocations
      const allocResponse = await fetch("/api/investments/allocations")
      if (allocResponse.ok) {
        const allocData = await allocResponse.json()
        setAllocations(allocData)
      }

      // Calculate available investment amount
      if (netSalary > 0) {
        const calcResponse = await fetch("/api/investments/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ netMonthly: netSalary }),
        })

        if (calcResponse.ok) {
          const calcData = await calcResponse.json()
          setCalculateData(calcData)
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load investment data")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateBucketAmount = (percent: number) => {
    if (!calculateData) return 0
    return (calculateData.availableForInvestment * percent) / 100
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.percent), 0)
  const hasAllocations = allocations.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Investment Portfolio
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your investment allocations and track portfolio performance
        </p>
      </div>

      {/* Available Investment Amount */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Available for Investment</span>
          </CardTitle>
          <CardDescription>
            Monthly amount available after tax, loan EMIs, and SIPs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {calculateData ? `₹${calculateData.availableForInvestment.toLocaleString()}` : "₹0"}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">/month</span>
            </div>

            {calculateData && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gross Income</p>
                  <p className="text-lg font-semibold">₹{calculateData.grossIncome.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tax</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    -₹{calculateData.taxAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loan EMIs ({calculateData.loanCount})</p>
                  <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    -₹{calculateData.totalLoanEMI.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">SIPs ({calculateData.sipCount})</p>
                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    -₹{calculateData.totalSIPAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">After Deductions</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    ₹{calculateData.afterLoans.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allocation Status */}
      {!hasAllocations && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                  No Investment Allocations Set
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                  Configure your investment bucket allocations to start tracking your portfolio.
                </p>
                <Button
                  onClick={() => router.push("/investments/allocations")}
                  className="mt-3"
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Allocations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Buckets */}
      {hasAllocations && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Investment Buckets
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/investments/allocations")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allocations.map((allocation) => {
              const amount = calculateBucketAmount(Number(allocation.percent))
              return (
                <Card key={allocation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {BUCKET_LABELS[allocation.bucket] || allocation.bucket}
                      </CardTitle>
                      <Badge className={BUCKET_COLORS[allocation.bucket]}>
                        {Number(allocation.percent).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Allocation</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          ₹{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <Link href={`/investments/holdings?bucket=${allocation.bucket}`}>
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          <Eye className="h-4 w-4 mr-2" />
                          View Holdings
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your investment portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              onClick={() => router.push("/investments/holdings")}
              variant="outline"
              className="justify-start"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View All Holdings
            </Button>
            <Button
              onClick={() => router.push("/investments/holdings/new")}
              variant="outline"
              className="justify-start"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Holding
            </Button>
            <Button
              onClick={() => router.push("/investments/allocations")}
              variant="outline"
              className="justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Allocations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
