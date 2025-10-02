"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Wallet, Settings, PlusCircle, Eye, AlertCircle, Calendar, BarChart3, Receipt } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AllocationData {
  id: string
  bucket: string
  allocationType: string
  percent?: number | null
  customAmount?: number | null
}

interface CalculateData {
  grossIncome: number
  taxAmount: number
  taxPercentage: number
  afterTax: number
  sipCount: number
  totalSIPAmount: number
  loanCount: number
  totalLoanEMI: number
  afterLoans: number
  availableForInvestment: number
  sipsByBucket?: Record<string, { count: number; total: number; sips: Array<{ id: string; name: string; amount: number; frequency: string; bucket: string; startDate?: string | null }> }>
  allSips?: Array<{
    id: string
    name: string
    amount: number
    frequency: string
    bucket: string
    startDate?: string
    isUpcoming?: boolean
  }>
}

interface HoldingData {
  id: string
  bucket: string
  symbol: string
  name: string
  qty: number
  avgCost: number
  currentPrice?: number
  currency: string
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
  const [holdings, setHoldings] = useState<HoldingData[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch current salary from salary history (most recent entry)
      const profileResponse = await fetch("/api/profile/salary-history")
      let monthlySalary = 0
      if (profileResponse.ok) {
        const salaryHistory = await profileResponse.json()
        if (salaryHistory && salaryHistory.length > 0) {
          monthlySalary = Number(salaryHistory[0].monthly)
        }
      }

      // Fetch allocations
      const allocResponse = await fetch("/api/investments/allocations")
      let allocData: AllocationData[] = []
      if (allocResponse.ok) {
        allocData = await allocResponse.json()
        setAllocations(allocData)
      }

      // Fetch holdings
      const holdingsResponse = await fetch("/api/investments/holdings")
      if (holdingsResponse.ok) {
        const holdingsData = await holdingsResponse.json()
        setHoldings(holdingsData)
      }

      // Calculate available investment amount
      if (monthlySalary > 0) {
        const calcResponse = await fetch("/api/investments/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthly: monthlySalary }),
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

  const calculateBucketAmount = (allocation: AllocationData) => {
    if (!calculateData) return 0
    const availableAmount = calculateData.availableForInvestment
    if (allocation.allocationType === "PERCENTAGE" && allocation.percent) {
      return (availableAmount * Number(allocation.percent)) / 100
    } else if (allocation.allocationType === "AMOUNT" && allocation.customAmount) {
      return Number(allocation.customAmount)
    }
    return 0
  }

  const calculateTotalAllocated = () => {
    if (!calculateData) return 0
    let total = 0
    allocations.forEach(allocation => {
      total += calculateBucketAmount(allocation)
    })
    return total
  }

  const calculateRemainingForInvestment = () => {
    if (!calculateData) return 0
    return calculateData.availableForInvestment - calculateTotalAllocated()
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

  const hasAllocations = allocations.length > 0

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Investment Portfolio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your investment allocations and track portfolio performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Available Investment Amount - Similar to Expenses Page */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Investment Allocation Overview</span>
          </CardTitle>
          <CardDescription>
            Track your investment allocations and available surplus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Investment Overview Cards */}
            {calculateData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Amount (After Tax & Loans) */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Total Amount
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    After Tax & Loans
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{calculateData.availableForInvestment.toLocaleString()}
                  </p>
                </div>

                {/* Total Allocated */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                    Total Allocated
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                    {hasAllocations ? 'To Buckets' : 'Not Set'}
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ₹{calculateTotalAllocated().toLocaleString()}
                  </p>
                </div>

                {/* Current Month Investment (SIPs) */}
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                    This Month SIPs
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">
                    {calculateData.sipCount} Active
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    ₹{calculateData.totalSIPAmount.toLocaleString()}
                  </p>
                </div>

                {/* Remaining for Investment */}
                <div className={`p-4 bg-gradient-to-br ${calculateRemainingForInvestment() >= 0 ? 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20' : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/20'} rounded-lg border-2 ${calculateRemainingForInvestment() >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                  <p className={`text-xs font-medium ${calculateRemainingForInvestment() >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'} mb-1`}>
                    Remaining
                  </p>
                  <p className={`text-xs ${calculateRemainingForInvestment() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mb-2`}>
                    {calculateRemainingForInvestment() >= 0 ? 'Unallocated' : 'Over Allocated'}
                  </p>
                  <p className={`text-2xl font-bold ${calculateRemainingForInvestment() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₹{calculateRemainingForInvestment().toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {calculateData && hasAllocations && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Allocation Progress</span>
                  <span className="font-medium">
                    {((calculateTotalAllocated() / calculateData.availableForInvestment) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    style={{
                      width: `${Math.min((calculateTotalAllocated() / calculateData.availableForInvestment) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {!hasAllocations && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <span className="text-sm text-orange-800 dark:text-orange-200">
                  ⚠️ Configure allocations to distribute your investment across buckets
                </span>
              </div>
            )}

            {/* Allocation Breakdown - Only show if allocations are set */}
            {hasAllocations && calculateData && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Bucket Allocations</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {allocations.map((allocation) => {
                    const allocatedAmount = calculateBucketAmount(allocation)
                    const bucketSIPs = calculateData.sipsByBucket?.[allocation.bucket]
                    const sipAmount = bucketSIPs?.total || 0
                    const availableForOneTime = allocatedAmount - sipAmount
                    const sipPercentage = allocatedAmount > 0 ? (sipAmount / allocatedAmount) * 100 : 0

                    return (
                      <div
                        key={allocation.id}
                        className="p-4 rounded-lg border-2 bg-white dark:bg-gray-900"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-base font-semibold">
                            {BUCKET_LABELS[allocation.bucket]}
                          </span>
                          <Badge className={BUCKET_COLORS[allocation.bucket]}>
                            {allocation.allocationType === "PERCENTAGE"
                              ? `${Number(allocation.percent || 0).toFixed(1)}%`
                              : "Fixed"}
                          </Badge>
                        </div>

                        {/* Total Allocation */}
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Total Allocation</span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              ₹{allocatedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>

                        {/* SIP Usage */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">SIPs ({bucketSIPs?.count || 0})</span>
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              ₹{sipAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>

                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500"
                              style={{ width: `${Math.min(sipPercentage, 100)}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Available for One-time</span>
                            <span className={`font-semibold ${availableForOneTime >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              ₹{availableForOneTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>

                        {availableForOneTime < 0 && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                            ⚠️ SIPs exceed allocation by ₹{Math.abs(availableForOneTime).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Income Breakdown */}
            {calculateData && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Monthly Cash Flow</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Gross Income</p>
                    <p className="text-sm font-semibold">₹{calculateData.grossIncome.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tax</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      -₹{calculateData.taxAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Loan EMIs ({calculateData.loanCount})</p>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      -₹{calculateData.totalLoanEMI.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Available</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      ₹{calculateData.availableForInvestment.toLocaleString()}
                    </p>
                  </div>
                </div>
                {calculateData.sipCount > 0 && (
                  <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm">
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      Active SIPs: {calculateData.sipCount} • Monthly: ₹{calculateData.totalSIPAmount.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (Included in bucket allocations)
                    </span>
                  </div>
                )}
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
              const amount = calculateBucketAmount(allocation)
              const bucketSIPs = calculateData?.sipsByBucket?.[allocation.bucket]
              return (
                <Card key={allocation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {BUCKET_LABELS[allocation.bucket] || allocation.bucket}
                      </CardTitle>
                      <Badge className={BUCKET_COLORS[allocation.bucket]}>
                        {allocation.allocationType === "PERCENTAGE"
                          ? `${Number(allocation.percent || 0).toFixed(1)}%`
                          : `₹${Number(allocation.customAmount || 0).toLocaleString()}`
                        }
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Total Allocation */}
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Total Monthly Allocation
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          ₹{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>

                      {/* SIP Information */}
                      {bucketSIPs && bucketSIPs.count > 0 && (
                        <div className="pt-3 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                              Active SIPs ({bucketSIPs.count})
                            </p>
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                              Recurring
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            ₹{bucketSIPs.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Auto-invested monthly via SIP
                          </p>
                        </div>
                      )}

                      {/* Available for One-time Investment */}
                      {bucketSIPs && bucketSIPs.count > 0 && amount > bucketSIPs.total && (
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Available for One-time Investment</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            ₹{(amount - bucketSIPs.total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Allocation - SIP Amount
                          </p>
                        </div>
                      )}

                      {/* No SIPs - Full amount available */}
                      {(!bucketSIPs || bucketSIPs.count === 0) && (
                        <div className="pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            No SIPs configured. Full allocation available for one-time investment.
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Link href={`/investments/holdings?bucket=${allocation.bucket}`} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            Holdings
                          </Button>
                        </Link>
                        <Link href={`/investments/sips?bucket=${allocation.bucket}`} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            SIPs
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming SIPs */}
      {calculateData?.allSips && calculateData.allSips.filter(s => s.isUpcoming).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Upcoming SIPs
            </CardTitle>
            <CardDescription>
              SIPs starting in the future (sorted by start date)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {calculateData.allSips
                .filter(s => s.isUpcoming)
                .sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime())
                .map((sip) => (
                <div
                  key={sip.id}
                  className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{sip.name}</p>
                      <Badge className={BUCKET_COLORS[sip.bucket]} variant="secondary">
                        {BUCKET_LABELS[sip.bucket]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Starts: {sip.startDate ? new Date(sip.startDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600 dark:text-orange-400">
                      ₹{Number(sip.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{sip.frequency}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holdings Summary */}
      {holdings && holdings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Current Holdings Summary
            </CardTitle>
            <CardDescription>
              Total invested value across all buckets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(
                holdings.reduce((acc, holding) => {
                  const bucket = holding.bucket
                  if (!acc[bucket]) {
                    acc[bucket] = { count: 0, totalInvested: 0, currentValue: 0 }
                  }
                  acc[bucket].count += 1
                  acc[bucket].totalInvested += Number(holding.qty) * Number(holding.avgCost)
                  acc[bucket].currentValue += Number(holding.qty) * (Number(holding.currentPrice) || Number(holding.avgCost))
                  return acc
                }, {} as Record<string, { count: number; totalInvested: number; currentValue: number }>)
              ).map(([bucket, data]) => {
                const profitLoss = data.currentValue - data.totalInvested
                const profitLossPercent = data.totalInvested > 0 ? (profitLoss / data.totalInvested) * 100 : 0
                return (
                  <div
                    key={bucket}
                    className="p-3 rounded-lg border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{BUCKET_LABELS[bucket]}</span>
                      <Badge variant="outline" className="text-xs">
                        {data.count} {data.count === 1 ? 'holding' : 'holdings'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Invested:</span>
                        <span className="font-semibold">₹{data.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Current:</span>
                        <span className="font-semibold">₹{data.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-xs pt-1 border-t">
                        <span className="text-muted-foreground">P/L:</span>
                        <span className={`font-bold ${profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {profitLoss >= 0 ? '+' : ''}₹{profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your investment portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              onClick={() => router.push("/investments/holdings")}
              variant="outline"
              className="justify-start"
            >
              <Eye className="h-4 w-4 mr-2" />
              View All Holdings
            </Button>
            <Button
              onClick={() => router.push("/investments/sips")}
              variant="outline"
              className="justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Manage SIPs
            </Button>
            <Button
              onClick={() => router.push("/investments/holdings/new")}
              variant="outline"
              className="justify-start"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Holding
            </Button>
            <Button
              onClick={() => router.push("/investments/allocations")}
              variant="outline"
              className="justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Allocations
            </Button>
            <Button
              onClick={() => router.push("/investments/one-time")}
              variant="outline"
              className="justify-start text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Wallet className="h-4 w-4 mr-2" />
              One-Time Purchase
            </Button>
            <Button
              onClick={() => router.push("/investments/transactions")}
              variant="outline"
              className="justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Transaction History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
