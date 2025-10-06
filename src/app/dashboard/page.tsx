import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireCustomerAccess } from "@/lib/authz"
import { prisma } from "@/lib/prisma"
import { IndianRupee, Receipt, Wallet, Repeat, TrendingUp } from "lucide-react"
import { DashboardFilter } from "@/components/dashboard/dashboard-filter"
import { cn } from "@/lib/utils"
import { calculateFinancialSummary } from "@/lib/budget-utils"
import { SalaryFlowPipeline } from "@/components/dashboard/salary-flow-pipeline"
import { RecentExpenses } from "@/components/dashboard/recent-expenses"
import { UpcomingEMI } from "@/components/dashboard/upcoming-emi"
import { getAmountForMonth } from "@/lib/frequency-utils"

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
    const amountForThisMonth = getAmountForMonth(
      sipAmount,
      sip.frequency,
      new Date(sip.startDate),
      month - 1, // month is 1-12, getAmountForMonth expects 0-11
      year
    )
    totalSIPAmount += amountForThisMonth
  })

  // Convert Decimal to number for client components
  const serializedSips = sips.map(sip => ({
    ...sip,
    amount: Number(sip.amount),
  }))

  return { count: sips.length, totalAmount: totalSIPAmount, sips: serializedSips }
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

  // Calculate current month's total EMI (both paid and unpaid)
  const currentMonthTotalEMI = loans.reduce((sum, loan) => {
    const allEmis = loan.emis
    const emiTotal = allEmis.reduce((emiSum, emi) => emiSum + Number(emi.emiAmount), 0)
    return sum + emiTotal
  }, 0)

  // Count all EMIs for current month
  const currentMonthEMICount = loans.reduce((count, loan) => {
    return count + loan.emis.length
  }, 0)

  // Count unpaid EMIs for badge display
  const unpaidEMICount = loans.reduce((count, loan) => {
    return count + loan.emis.filter(emi => !emi.isPaid).length
  }, 0)

  const totalEMI = loans.reduce((sum, loan) => sum + Number(loan.emiAmount), 0)

  // Convert Decimal to number for client components
  const serializedLoans = loans.map(loan => ({
    ...loan,
    principalAmount: Number(loan.principalAmount),
    interestRate: loan.interestRate ? Number(loan.interestRate) : null,
    emiAmount: Number(loan.emiAmount),
    currentOutstanding: loan.currentOutstanding ? Number(loan.currentOutstanding) : null,
    totalPaid: loan.totalPaid ? Number(loan.totalPaid) : null,
    emis: loan.emis.map(emi => ({
      ...emi,
      emiAmount: Number(emi.emiAmount),
      paidAmount: emi.paidAmount ? Number(emi.paidAmount) : null,
      principalPaid: emi.principalPaid ? Number(emi.principalPaid) : null,
      interestPaid: emi.interestPaid ? Number(emi.interestPaid) : null,
      lateFee: emi.lateFee ? Number(emi.lateFee) : null,
    })),
  }))

  return { count: loans.length, totalEMI, loans: serializedLoans, currentMonthTotalEMI, currentMonthEMICount, unpaidEMICount }
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

  // Convert Decimal to number for client components
  const serializedExpenses = expenses.map(expense => ({
    ...expense,
    amount: Number(expense.amount),
    needsPortion: expense.needsPortion ? Number(expense.needsPortion) : null,
    avoidPortion: expense.avoidPortion ? Number(expense.avoidPortion) : null,
  }))

  return { expenses: serializedExpenses, totalExpenses }
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

  // Use new budget/allocation logic with current month's total EMI
  const financialSummary = calculateFinancialSummary(
    totalIncome,
    taxAmount,
    loansData.currentMonthTotalEMI,
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
        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
          <div className="relative p-3 sm:p-4">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Income ({new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'short' })})</div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-100/80 dark:bg-green-900/40 backdrop-blur-sm border border-green-200/50 dark:border-green-700/50 flex items-center justify-center shrink-0">
                <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 break-words">
              {totalIncome > 0 ? `₹${totalIncome.toLocaleString('en-IN')}` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {additionalIncome.count > 0 ? `Salary: ₹${salary.toLocaleString('en-IN')} + ₹${additionalIncome.totalIncome.toLocaleString('en-IN')} other` : 'Monthly income'}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
          <div className="relative p-3 sm:p-4">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">EMI ({new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'short' })})</div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-orange-100/80 dark:bg-orange-900/40 backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/50 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 break-words">
              ₹{loansData.currentMonthTotalEMI.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loansData.currentMonthEMICount} EMI{loansData.currentMonthEMICount !== 1 ? 's' : ''} ({loansData.unpaidEMICount} unpaid)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 pointer-events-none"></div>
          <div className="relative p-3 sm:p-4">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Active SIPs</div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100/80 dark:bg-purple-900/40 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50 flex items-center justify-center shrink-0">
                <Repeat className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 break-words">
              ₹{sipsData.totalAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sipsData.count} active SIP{sipsData.count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>
          <div className="relative p-3 sm:p-4">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Total Expenses</div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-100/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 break-words">
              ₹{expensesData.totalExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">₹{(financialSummary.availableForExpenses-expensesData.totalExpenses).toLocaleString('en-IN')} Remaining</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            surplus >= 0
              ? "bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5"
              : "bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5"
          )}></div>
          <div className="relative p-3 sm:p-4">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Surplus</div>
              <div className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 rounded-full backdrop-blur-sm border flex items-center justify-center shrink-0",
                surplus >= 0
                  ? "bg-emerald-100/80 dark:bg-emerald-900/40 border-emerald-200/50 dark:border-emerald-700/50"
                  : "bg-red-100/80 dark:bg-red-900/40 border-red-200/50 dark:border-red-700/50"
              )}>
                <TrendingUp className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5",
                  surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )} />
              </div>
            </div>
            <div className={cn(
              "text-xl sm:text-2xl font-bold break-words",
              surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">After expenses</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 items-start">
        {/* Recent Expenses */}
        <RecentExpenses
          expenses={expensesData.expenses}
          totalExpenses={expensesData.totalExpenses}
          monthName={monthName}
          selectedYear={selectedYear}
        />

        {/* Upcoming EMIs */}
        <UpcomingEMI
          loans={loansData.loans}
          monthName={monthName}
          selectedYear={selectedYear}
        />
      </div>

      {/* Salary Flow Pipeline */}
      <SalaryFlowPipeline
        totalIncome={totalIncome}
        salary={salary}
        additionalIncome={additionalIncome}
        taxAmount={taxAmount}
        taxPercentage={taxPercentage}
        afterTax={afterTax}
        loansData={loansData}
        afterLoans={afterLoans}
        sipsData={sipsData}
        afterSIPs={afterSIPs}
        financialSummary={financialSummary}
        allocations={allocations}
        hasAllocations={hasAllocations}
        expensesData={expensesData}
        surplus={surplus}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </div>
  )
}