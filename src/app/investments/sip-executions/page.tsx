"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      totals[exec.status].amount += exec.amount
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          SIP Execution History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track all automated SIP executions and their status
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
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
            <SelectTrigger className="w-[100px]">
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
            <SelectTrigger className="w-[140px]">
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

      {/* Summary Cards */}
      {executions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Attempted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ₹{grandTotal.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {executions.length} executions
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₹{totals.SUCCESS.amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.SUCCESS.count} successful
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ₹{totals.FAILED.amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.FAILED.count} failed
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                ₹{totals.PENDING.amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.PENDING.count} pending
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Executions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                All SIP Executions
              </CardTitle>
              <CardDescription>
                Execution history for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </CardDescription>
            </div>
            {executions.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {executions.length} {executions.length === 1 ? 'Execution' : 'Executions'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {executions.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">SIP Name</TableHead>
                    <TableHead className="font-semibold">Bucket</TableHead>
                    <TableHead className="font-semibold">Symbol</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
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
                        ₹{exec.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {exec.qty ? exec.qty.toLocaleString(undefined, { maximumFractionDigits: 9 }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {exec.price ? `₹${exec.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "-"}
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
        </CardContent>
      </Card>
    </div>
  )
}
