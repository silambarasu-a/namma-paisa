"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DashboardFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(searchParams.get("month") || String(currentMonth))
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || String(currentYear))

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

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    router.push(`/dashboard?month=${month}&year=${selectedYear}`)
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    router.push(`/dashboard?month=${selectedMonth}&year=${year}`)
  }

  return (
    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-100 shrink-0" />
      <Select value={selectedMonth} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[110px] sm:w-[140px] bg-white/10 border-white/20 text-white text-sm">
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

      <Select value={selectedYear} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[85px] sm:w-[100px] bg-white/10 border-white/20 text-white text-sm">
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
  )
}