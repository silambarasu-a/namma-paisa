"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Calendar, TrendingUp, CheckCircle, AlertCircle, Clock, Filter } from "lucide-react"
import type { SIPExecution, ExecutionStatus } from "@/types"
import {
  BUCKET_LABELS,
  EXECUTION_STATUS_LABELS,
  EXECUTION_STATUS_COLORS,
} from "@/constants"

interface SIPExecutionWithRelations extends Omit<SIPExecution, 'executionDate' | 'createdAt' | 'updatedAt'> {
  executionDate: string
  createdAt: string
  updatedAt: string
  sip: {
    id: string
    name: string
    bucket: string | null
    symbol: string | null
  }
  holding?: {
    id: string
    name: string
    symbol: string
  } | null
}

export default function SIPExecutionsPage() {
  const [executions, setExecutions] = useState<SIPExecutionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

  useEffect(() => {
    loadExecutions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedStatus])

  const loadExecutions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
      })

      if (selectedStatus !== "all") {
        params.append("status", selectedStatus)
      }

      const response = await fetch(`/api/investments/sip-executions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setExecutions(data)
      } else {
        toast.error("Failed to load SIP executions")
      }
    } catch (error) {
      console.error("Error loading executions:", error)
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTotals = () => {
    const totals: Record<ExecutionStatus, { count: number; amount: number }> = {
      SUCCESS: { count: 0, amount: 0 },
      FAILED: { count: 0, amount: 0 },
      PENDING: { count: 0, amount: 0 },
    }

    executions.forEach((exec) => {
      totals[exec.status].count += 1
      // Use amountInr if available (for USD SIPs), otherwise use amount (for INR)
      let amountInInr: number
      if (exec.currency === "USD") {
        // For USD executions, use amountInr if available, otherwise convert using usdInrRate
        if (exec.amountInr) {
          amountInInr = Number(exec.amountInr)
        } else if (exec.usdInrRate) {
          amountInInr = Number(exec.amount) * Number(exec.usdInrRate)
        } else {
          // Fallback: skip this execution if we can't convert to INR
          amountInInr = 0
        }
      } else {
        // For INR executions, use amount directly
        amountInInr = Number(exec.amount)
      }
      totals[exec.status].amount += amountInInr
    })

    return totals
  }

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

  const statuses = [
    { value: "all", label: "All Status" },
    { value: "SUCCESS", label: "Success" },
    { value: "FAILED", label: "Failed" },
    { value: "PENDING", label: "Pending" },
  ]

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

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

  const totals = calculateTotals()
  const grandTotal = totals.SUCCESS.amount + totals.FAILED.amount + totals.PENDING.amount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          SIP Execution History
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Track all automated SIP executions and their status
        </p>
      </div>

      {/* Filters */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
        <div className="relative flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Filters</h3>
          </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full">
              <SelectValue />
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
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>
      </div>

      {/* Summary Cards */}
      {executions.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-white/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-blue-100/80 dark:bg-blue-900/40 rounded-xl backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Attempted</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{grandTotal.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {executions.length} executions
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-green-100/80 dark:bg-green-900/40 rounded-xl backdrop-blur-sm border border-green-200/50 dark:border-green-700/50">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₹{totals.SUCCESS.amount.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.SUCCESS.count} successful
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50/80 via-rose-50/60 to-white/60 dark:from-red-900/20 dark:via-rose-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-red-200/50 dark:border-red-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-red-100/80 dark:bg-red-900/40 rounded-xl backdrop-blur-sm border border-red-200/50 dark:border-red-700/50">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ₹{totals.FAILED.amount.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.FAILED.count} failed
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-50/80 via-amber-50/60 to-white/60 dark:from-yellow-900/20 dark:via-amber-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
            <div className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-yellow-100/80 dark:bg-yellow-900/40 rounded-xl backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-700/50">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    ₹{totals.PENDING.amount.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.PENDING.count} pending
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Executions Table */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
        <div className="relative">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                  <TrendingUp className="h-5 w-5" />
                  All SIP Executions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Execution history for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </p>
              </div>
              {executions.length > 0 && (
                <Badge variant="secondary" className="text-sm bg-purple-100/80 dark:bg-purple-900/40 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50">
                  {executions.length} {executions.length === 1 ? 'Execution' : 'Executions'}
                </Badge>
              )}
            </div>
          </div>
          <div className="px-6 pb-6">
          {executions.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">SIP Name</TableHead>
                    <TableHead className="font-semibold">Bucket</TableHead>
                    <TableHead className="font-semibold">Symbol</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                    <TableHead className="text-right font-semibold">Amount (INR)</TableHead>
                    <TableHead className="text-right font-semibold">Quantity</TableHead>
                    <TableHead className="text-right font-semibold">Price</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((exec) => (
                    <TableRow key={exec.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(exec.executionDate).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {exec.sip.name}
                      </TableCell>
                      <TableCell>
                        {exec.sip.bucket ? (
                          <Badge variant="outline">
                            {BUCKET_LABELS[exec.sip.bucket] || exec.sip.bucket}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {exec.sip.symbol || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {exec.currency === "USD" ? "$" : "₹"}{exec.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {exec.amountInr ? `₹${exec.amountInr.toLocaleString()}` : "-"}
                        {exec.usdInrRate && exec.currency === "USD" && (
                          <div className="text-xs text-muted-foreground">
                            @ ₹{exec.usdInrRate.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {exec.qty ? exec.qty.toLocaleString(undefined, { maximumFractionDigits: 9 }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {exec.price ? `${exec.currency === "USD" ? "$" : "₹"}${exec.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(exec.status)}
                          <Badge className={EXECUTION_STATUS_COLORS[exec.status]}>
                            {EXECUTION_STATUS_LABELS[exec.status]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={exec.errorMessage || ""}>
                        {exec.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <TrendingUp className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">No Executions Found</h3>
                  <p className="text-muted-foreground text-sm">
                    No SIP executions for the selected period. SIPs run automatically at the end of each day.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
