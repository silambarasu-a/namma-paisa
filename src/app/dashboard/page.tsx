import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireAuth } from "@/lib/authz"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, TrendingUp, Receipt, Calculator, Wallet, Repeat, ArrowRight, PieChart, AlertCircle } from "lucide-react"
import { SalaryFlowChart } from "@/components/dashboard/salary-flow-chart"
import { InvestmentBreakdownChart } from "@/components/dashboard/investment-breakdown-chart"
import { DashboardFilter } from "@/components/dashboard/dashboard-filter"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Dashboard",
}

async function getSalary(userId: string, month: number, year: number) {
  // Get salary that was effective during the selected month/year
  const targetDate = new Date(year, month - 1, 1)

  const salary = await prisma.salaryHistory.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: targetDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gt: targetDate } }
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
  const targetDate = new Date(year, month - 1, 1)
  const sips = await prisma.sIP.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lte: targetDate },
      OR: [
        { endDate: null },
        { endDate: { gte: targetDate } },
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
      if (startDate.getMonth() === targetDate.getMonth()) {
        totalSIPAmount += sipAmount / 12
      }
    } else if (sip.frequency === "CUSTOM" && sip.customDay) {
      if (targetDate.getDate() === sip.customDay) {
        totalSIPAmount += sipAmount
      }
    }
  })

  return { count: sips.length, totalAmount: totalSIPAmount, sips }
}

async function getInvestmentAllocations(userId: string) {
  const allocations = await prisma.investmentAllocation.findMany({
    where: { userId },
  })
  return allocations
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

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  return { expenses, totalExpenses }
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const userId = session!.user.id
  const params = await searchParams
  const selectedMonth = params.month ? parseInt(params.month) : new Date().getMonth() + 1
  const selectedYear = params.year ? parseInt(params.year) : new Date().getFullYear()

  // Fetch all data in parallel
  const [salary, additionalIncome, sipsData, loansData, expensesData, allocations] = await Promise.all([
    getSalary(userId, selectedMonth, selectedYear),
    getAdditionalIncome(userId, selectedMonth, selectedYear),
    getActiveSIPs(userId, selectedMonth, selectedYear),
    getActiveLoans(userId, selectedMonth, selectedYear),
    getRecentExpenses(userId, selectedMonth, selectedYear),
    getInvestmentAllocations(userId),
  ])

  const totalIncome = salary + additionalIncome.totalIncome
  const { taxAmount, taxPercentage } = await getTaxCalculation(userId, totalIncome)

  // Calculate salary flow
  const afterTax = totalIncome - taxAmount
  const afterLoans = afterTax - loansData.totalEMI
  const afterSIPs = afterLoans - sipsData.totalAmount
  const surplus = afterSIPs - expensesData.totalExpenses

  // Calculate investment allocation if there are allocations set
  const hasAllocations = allocations.length > 0

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'long' })

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-blue-100 dark:text-blue-200 mt-2">
              Complete overview of your financial pipeline - {monthName} {selectedYear}
            </p>
          </div>
          <DashboardFilter />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 -mt-12">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income ({new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'short' })})</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totalIncome > 0 ? `₹${totalIncome.toLocaleString('en-IN')}` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {additionalIncome.count > 0 ? `Salary: ₹${salary.toLocaleString('en-IN')} + ₹${additionalIncome.totalIncome.toLocaleString('en-IN')} other` : 'Monthly income'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {loansData.count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total EMI: ₹{loansData.totalEMI.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SIPs</CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Repeat className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {sipsData.count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly: ₹{sipsData.totalAmount.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              ₹{expensesData.totalExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surplus</CardTitle>
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              surplus >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
            )}>
              <TrendingUp className={cn(
                "h-5 w-5",
                surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
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
        <CardHeader>
          <CardTitle>Salary Flow Pipeline</CardTitle>
          <CardDescription>
            Complete breakdown of how your salary is distributed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Income */}
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-lg">Income ({new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'short' })})</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Your monthly income</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₹{totalIncome.toLocaleString('en-IN')}
                </div>
                {additionalIncome.count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Salary ₹{salary.toLocaleString('en-IN')} + Other ₹{additionalIncome.totalIncome.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Tax Deduction */}
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-lg">Tax Deduction</h3>
                  <Badge variant="destructive">{taxPercentage.toFixed(1)}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Tax savings and deductions</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  -₹{taxAmount.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: ₹{afterTax.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Loans */}
            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-semibold text-lg">Loan EMIs</h3>
                  <Badge variant="secondary">{loansData.count} active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Monthly loan payments</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  -₹{loansData.totalEMI.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: ₹{afterLoans.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* SIPs */}
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-lg">Active SIPs</h3>
                  <Badge variant="secondary">{sipsData.count} active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Systematic investment plans</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  -₹{sipsData.totalAmount.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: ₹{afterSIPs.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Investment Allocation */}
            {hasAllocations ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-lg">Investment Buckets</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allocated across {allocations.length} bucket{allocations.length !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allocations.map((alloc) => (
                      <Badge key={alloc.bucket} variant="outline">
                        {alloc.bucket.replace('_', ' ')}: {Number(alloc.percent).toFixed(0)}%
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Available</p>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{afterSIPs.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border-l-4 border-gray-400">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-lg text-gray-600 dark:text-gray-400">Investment Buckets</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">No allocations set yet</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Expenses */}
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-lg">Total Expenses</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Monthly spending</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  -₹{expensesData.totalExpenses.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: ₹{(afterSIPs - expensesData.totalExpenses).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Surplus */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-lg border-l-4",
              surplus >= 0
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500"
                : "bg-red-50 dark:bg-red-900/20 border-red-500"
            )}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )} />
                  <h3 className="font-semibold text-lg">Month Surplus</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {surplus >= 0 ? 'Savings for the month' : 'Deficit for the month'}
                </p>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-2xl font-bold",
                  surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                  {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Expenses */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Last 5 expenses for {monthName} {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesData.expenses.length > 0 ? (
              <div className="space-y-3">
                {expensesData.expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={expense.expenseType === 'EXPECTED' ? 'secondary' : 'destructive'}>
                          {expense.expenseType}
                        </Badge>
                        <Badge variant="outline">{expense.category}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{Number(expense.amount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No expenses recorded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming EMIs */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Upcoming EMI Payments</CardTitle>
            <CardDescription>Next 3 unpaid EMIs across all loans</CardDescription>
          </CardHeader>
          <CardContent>
            {loansData.loans.length > 0 && loansData.loans.some(loan => loan.emis.length > 0) ? (
              <div className="space-y-3">
                {loansData.loans.map((loan) =>
                  loan.emis.slice(0, 3).map((emi) => (
                    <div key={emi.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                      <div>
                        <p className="font-medium">{loan.loanType.replace('_', ' ')}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">{loan.institution}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(emi.dueDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{Number(emi.emiAmount).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No active loans</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}