import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireCustomerAccess } from "@/lib/authz"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, Receipt, Calculator, Wallet, Repeat, ArrowRight, PieChart, AlertCircle, TrendingUp } from "lucide-react"
import { DashboardFilter } from "@/components/dashboard/dashboard-filter"
import { cn } from "@/lib/utils"
import { calculateFinancialSummary } from "@/lib/budget-utils"

export const metadata: Metadata = {
  title: "Dashboard",
}

async function getSalary(userId: string, month: number, year: number) {
  // Get salary that was effective during the selected month/year
  // Use end of month to catch any salary starting within the month
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  const salary = await prisma.salaryHistory.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: endOfMonth },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: startOfMonth } }
      ]
    },
    orderBy: { effectiveFrom: "desc" },
  })
  return salary ? Number(salary.monthly) : 0
}

async function getAdditionalIncome(userId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  const incomes = await prisma.income.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const totalIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0)
  return { totalIncome, count: incomes.length }
}

async function getTaxCalculation(userId: string, salary: number) {
  const taxSetting = await prisma.taxSetting.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })

  let taxAmount = 0
  let taxPercentage = 0

  if (taxSetting && salary > 0) {
    switch (taxSetting.mode) {
      case "PERCENTAGE":
        if (taxSetting.percentage) {
          taxAmount = (salary * Number(taxSetting.percentage)) / 100
          taxPercentage = Number(taxSetting.percentage)
        }
        break
      case "FIXED":
        if (taxSetting.fixedAmount) {
          taxAmount = Number(taxSetting.fixedAmount)
          taxPercentage = (taxAmount / salary) * 100
        }
        break
      case "HYBRID":
        if (taxSetting.percentage && taxSetting.fixedAmount) {
          const percentAmount = (salary * Number(taxSetting.percentage)) / 100
          taxAmount = percentAmount + Number(taxSetting.fixedAmount)
          taxPercentage = (taxAmount / salary) * 100
        }
        break
    }
  }

  return { taxAmount, taxPercentage }
}

async function getActiveSIPs(userId: string, month: number, year: number) {
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 1)

  const sips = await prisma.sIP.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lt: endOfMonth }, // Started before end of month
      OR: [
        { endDate: null },
        { endDate: { gte: startOfMonth } }, // Ends on or after start of month
      ],
    },
  })

  let totalSIPAmount = 0
  sips.forEach((sip) => {
    const sipAmount = Number(sip.amount)
    if (sip.frequency === "MONTHLY") {
      totalSIPAmount += sipAmount
    } else if (sip.frequency === "YEARLY") {
      const startDate = new Date(sip.startDate)
      if (startDate.getMonth() === startOfMonth.getMonth()) {
        totalSIPAmount += sipAmount
      }
    } else if (sip.frequency === "CUSTOM" && sip.customDay) {
      // For custom frequency, just add the amount regardless of the day
      // since it occurs within this month
      totalSIPAmount += sipAmount
    }
  })

  return { count: sips.length, totalAmount: totalSIPAmount, sips }
}

async function getInvestmentAllocations(userId: string) {
  const allocationData = await prisma.investmentAllocation.findMany({
    where: { userId },
  })

  return allocationData.map(a => ({
    bucket: a.bucket,
    allocationType: a.allocationType as "PERCENTAGE" | "AMOUNT",
    percent: a.percent ? Number(a.percent) : null,
    customAmount: a.customAmount ? Number(a.customAmount) : null,
  }))
}

async function getExpenseBudget(userId: string) {
  const budgetData = await prisma.expenseBudget.findUnique({
    where: { userId },
  })

  if (!budgetData) return null

  return {
    expectedPercent: budgetData.expectedPercent ? Number(budgetData.expectedPercent) : null,
    expectedAmount: budgetData.expectedAmount ? Number(budgetData.expectedAmount) : null,
    unexpectedPercent: budgetData.unexpectedPercent ? Number(budgetData.unexpectedPercent) : null,
    unexpectedAmount: budgetData.unexpectedAmount ? Number(budgetData.unexpectedAmount) : null,
  }
}

async function getActiveLoans(userId: string, month: number, year: number) {
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 1)

  const loans = await prisma.loan.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lt: endOfMonth },
      OR: [
        { endDate: null },
        { endDate: { gte: startOfMonth } }
      ]
    },
    include: {
      emis: {
        where: {
          dueDate: {
            gte: startOfMonth,
            lt: endOfMonth
          }
        },
        orderBy: { dueDate: "asc" },
        take: 3,
      },
    },
  })

  const totalEMI = loans.reduce((sum, loan) => sum + Number(loan.emiAmount), 0)
  return { count: loans.length, totalEMI, loans }
}

async function getRecentExpenses(userId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  // Get recent expenses for display
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: { date: "desc" },
    take: 5,
  })

  // Get all expenses to calculate total
  const allExpenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      amount: true,
    },
  })

  const totalExpenses = allExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  return { expenses, totalExpenses }
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const session = await getServerSession(authOptions)
  requireCustomerAccess(session)

  const userId = session!.user.id
  const params = await searchParams
  const selectedMonth = params.month ? parseInt(params.month) : new Date().getMonth() + 1
  const selectedYear = params.year ? parseInt(params.year) : new Date().getFullYear()

  // Fetch all data in parallel
  const [salary, additionalIncome, sipsData, loansData, expensesData, allocations, budget] = await Promise.all([
    getSalary(userId, selectedMonth, selectedYear),
    getAdditionalIncome(userId, selectedMonth, selectedYear),
    getActiveSIPs(userId, selectedMonth, selectedYear),
    getActiveLoans(userId, selectedMonth, selectedYear),
    getRecentExpenses(userId, selectedMonth, selectedYear),
    getInvestmentAllocations(userId),
    getExpenseBudget(userId),
  ])

  const totalIncome = salary + additionalIncome.totalIncome
  const { taxAmount, taxPercentage } = await getTaxCalculation(userId, totalIncome)

  // Use new budget/allocation logic
  const financialSummary = calculateFinancialSummary(
    totalIncome,
    taxAmount,
    loansData.totalEMI,
    sipsData.totalAmount,
    expensesData.totalExpenses,
    budget,
    allocations
  )

  // Keep old variables for backwards compatibility
  const afterTax = financialSummary.afterTax
  const afterLoans = financialSummary.afterLoans
  const afterSIPs = financialSummary.afterSIPs
  const surplus = financialSummary.surplus

  // Calculate investment allocation if there are allocations set
  const hasAllocations = allocations.length > 0

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'long' })

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-4 md:-mx-8 -mt-20 px-4 md:px-8 pt-24 pb-6 md:pb-8 mb-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-sm md:text-base text-blue-100 dark:text-blue-200 mt-1 md:mt-2 break-words">
                Financial overview - {monthName} {selectedYear}
              </p>
            </div>
            <div className="shrink-0">
              <DashboardFilter />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 -mt-12">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 pt-0 sm:p-4 sm:pt-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Income ({new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'short' })})</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pb-0 pt-0 sm:p-4 sm:py-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 break-words">
              {totalIncome > 0 ? `₹${totalIncome.toLocaleString('en-IN')}` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {additionalIncome.count > 0 ? `Salary: ₹${salary.toLocaleString('en-IN')} + ₹${additionalIncome.totalIncome.toLocaleString('en-IN')} other` : 'Monthly income'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 pt-0 sm:p-4 sm:pt-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Loans</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pb-0 pt-0 sm:p-4 sm:py-0">
            <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 break-words">
              ₹{loansData.totalEMI.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loansData.count} active loan{loansData.count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 pt-0 sm:p-4 sm:pt-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Active SIPs</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Repeat className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pb-0 pt-0 sm:p-4 sm:py-0">
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 break-words">
              ₹{sipsData.totalAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sipsData.count} active SIP{sipsData.count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 pt-0 sm:p-4 sm:pt-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pb-0 pt-0 sm:p-4 sm:py-0">
            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 break-words">
              ₹{expensesData.totalExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">₹{(financialSummary.availableForExpenses-expensesData.totalExpenses).toLocaleString('en-IN')} Remaining</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 pt-0 sm:p-4 sm:pt-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Surplus</CardTitle>
            <div className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0",
              surplus >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
            )}>
              <TrendingUp className={cn(
                "h-4 w-4 sm:h-5 sm:w-5",
                surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )} />
            </div>
          </CardHeader>
          <CardContent className="p-3 pb-0 pt-0 sm:p-4 sm:py-0">
            <div className={cn(
              "text-xl sm:text-2xl font-bold break-words",
              surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">After expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Flow Pipeline */}
      <Card className="shadow-lg">
        <CardHeader className="p-4 sm:px-6 sm:py-0">
          <CardTitle className="text-lg sm:text-xl">Salary Flow Pipeline</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Complete breakdown of how your salary is distributed
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Income */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">Income ({new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'short' })})</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your monthly income</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 break-words">
                  ₹{totalIncome.toLocaleString('en-IN')}
                </div>
                {additionalIncome.count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    Salary ₹{salary.toLocaleString('en-IN')} + Other ₹{additionalIncome.totalIncome.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Tax Deduction */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">Tax Deduction</h3>
                  <Badge variant="destructive" className="text-xs">{taxPercentage.toFixed(1)}%</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Tax savings and deductions</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 break-words">
                  -₹{taxAmount.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  Remaining: ₹{afterTax.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Loans */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">Loan EMIs</h3>
                  <Badge variant="secondary" className="text-xs">{loansData.count} active</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Monthly loan payments</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 break-words">
                  -₹{loansData.totalEMI.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  Remaining: ₹{afterLoans.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* SIPs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Repeat className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">Active SIPs</h3>
                  <Badge variant="secondary" className="text-xs">{sipsData.count} active</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Systematic investment plans</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 break-words">
                  -₹{sipsData.totalAmount.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  Remaining: ₹{afterSIPs.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Available for Expenses & Investment */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">Available After Deductions</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  For expenses and investments
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 break-words">
                  ₹{financialSummary.availableSurplus.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Budget for Expenses */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">Available for Expenses</h3>
                  {financialSummary.isUsingBudget && (
                    <Badge variant="secondary" className="text-xs">Budgeted</Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  {financialSummary.isUsingBudget
                    ? `Expected: ₹${financialSummary.expectedBudget.toLocaleString('en-IN')} + Unexpected: ₹${financialSummary.unexpectedBudget.toLocaleString('en-IN')}`
                    : 'No budget set - using available surplus'}
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400 break-words">
                  ₹{financialSummary.availableForExpenses.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Investment Allocation */}
            {hasAllocations ? (
              <div className="flex flex-col gap-3 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <h3 className="font-semibold text-base sm:text-lg">Available for Investment</h3>
                      <Badge variant="secondary" className="text-xs">Allocated</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Allocated across {allocations.length} bucket{allocations.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 break-words">
                      ₹{financialSummary.availableForInvestment.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {financialSummary.investmentAllocationBreakdown.map((alloc) => (
                    <Badge key={alloc.bucket} variant="outline" className="text-xs">
                      {alloc.bucket.replace(/_/g, ' ')}: ₹{alloc.amount.toLocaleString('en-IN')}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border-l-4 border-gray-400">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400 shrink-0" />
                    <h3 className="font-semibold text-base sm:text-lg text-gray-600 dark:text-gray-400">Available for Investment</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    No allocation set - ₹{financialSummary.availableForInvestment.toLocaleString('en-IN')} available from surplus
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Expenses */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">Total Expenses</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Monthly spending</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 break-words">
                  -₹{expensesData.totalExpenses.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  Remaining: ₹{(afterSIPs - expensesData.totalExpenses).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Surplus */}
            <div className={cn(
              "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-lg border-l-4",
              surplus >= 0
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500"
                : "bg-red-50 dark:bg-red-900/20 border-red-500"
            )}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TrendingUp className={cn(
                    "h-4 w-4 sm:h-5 sm:w-5 shrink-0",
                    surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )} />
                  <h3 className="font-semibold text-base sm:text-lg">Month Surplus</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {surplus >= 0 ? 'Savings for the month' : 'Deficit for the month'}
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className={cn(
                  "text-xl sm:text-2xl font-bold break-words",
                  surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                  {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Recent Expenses */}
        <Card className="shadow-lg py-1 gap-0">
          <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <CardTitle className="text-lg sm:text-xl">Recent Expenses</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Last 5 expenses for {monthName} {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {expensesData.expenses.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {expensesData.expenses.map((expense) => (
                  <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base break-words text-blue-700 dark:text-blue-400">{expense.title}</p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <Badge variant={expense.expenseType === 'EXPECTED' ? 'secondary' : 'destructive'} className="text-xs">
                          {expense.expenseType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-bold text-base sm:text-lg break-words text-red-600 dark:text-red-400">₹{Number(expense.amount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">No expenses recorded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming EMIs */}
        <Card className="shadow-lg py-0 gap-0">
          <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <CardTitle className="text-lg sm:text-xl">Upcoming EMI Payments</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Next 3 unpaid EMIs across all loans</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loansData.loans.length > 0 && loansData.loans.some(loan => loan.emis.length > 0) ? (
              <div className="space-y-2 sm:space-y-3">
                {loansData.loans.map((loan) =>
                  loan.emis.slice(0, 3).map((emi) => (
                    <div key={emi.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base break-words">{loan.loanType.replace('_', ' ')}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                          <p className="text-xs text-muted-foreground break-words">{loan.institution}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(emi.dueDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="font-bold text-base sm:text-lg break-words text-orange-600 dark:text-orange-400">₹{Number(emi.emiAmount).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">No active loans</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}