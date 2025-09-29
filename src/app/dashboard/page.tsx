import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireAuth } from "@/lib/authz"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, TrendingUp, Receipt, Calculator, Wallet, Repeat, ArrowRight, PieChart, AlertCircle } from "lucide-react"
import { SalaryFlowChart } from "@/components/dashboard/salary-flow-chart"
import { InvestmentBreakdownChart } from "@/components/dashboard/investment-breakdown-chart"

async function getNetSalary(userId: string) {
  const latestSalary = await prisma.netSalaryHistory.findFirst({
    where: { userId },
    orderBy: { effectiveFrom: "desc" },
  })
  return latestSalary ? Number(latestSalary.netMonthly) : 0
}

async function getTaxCalculation(userId: string, netSalary: number) {
  const taxSetting = await prisma.taxSetting.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })

  let taxAmount = 0
  let taxPercentage = 0

  if (taxSetting && netSalary > 0) {
    switch (taxSetting.mode) {
      case "PERCENTAGE":
        if (taxSetting.percentage) {
          taxAmount = (netSalary * Number(taxSetting.percentage)) / 100
          taxPercentage = Number(taxSetting.percentage)
        }
        break
      case "FIXED":
        if (taxSetting.fixedAmount) {
          taxAmount = Number(taxSetting.fixedAmount)
          taxPercentage = (taxAmount / netSalary) * 100
        }
        break
      case "HYBRID":
        if (taxSetting.percentage && taxSetting.fixedAmount) {
          const percentAmount = (netSalary * Number(taxSetting.percentage)) / 100
          taxAmount = percentAmount + Number(taxSetting.fixedAmount)
          taxPercentage = (taxAmount / netSalary) * 100
        }
        break
    }
  }

  return { taxAmount, taxPercentage }
}

async function getActiveSIPs(userId: string) {
  const now = new Date()
  const sips = await prisma.sIP.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
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
      if (startDate.getMonth() === now.getMonth()) {
        totalSIPAmount += sipAmount / 12
      }
    } else if (sip.frequency === "CUSTOM" && sip.customDay) {
      if (now.getDate() === sip.customDay) {
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

async function getActiveLoans(userId: string) {
  const loans = await prisma.loan.findMany({
    where: { userId, isActive: true },
    include: {
      emis: {
        where: { isPaid: false },
        orderBy: { dueDate: "asc" },
        take: 3,
      },
    },
  })

  const totalEMI = loans.reduce((sum, loan) => sum + Number(loan.emiAmount), 0)
  return { count: loans.length, totalEMI, loans }
}

async function getRecentExpenses(userId: string) {
  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
  })
  return expenses
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const userId = session!.user.id

  // Fetch all data in parallel
  const [netSalary, sipsData, loansData, expenses, allocations] = await Promise.all([
    getNetSalary(userId),
    getActiveSIPs(userId),
    getActiveLoans(userId),
    getRecentExpenses(userId),
    getInvestmentAllocations(userId),
  ])

  const { taxAmount, taxPercentage } = await getTaxCalculation(userId, netSalary)

  // Calculate salary flow
  const afterTax = netSalary - taxAmount
  const afterSIPs = afterTax - sipsData.totalAmount
  const availableForExpenses = Math.max(0, afterSIPs)

  // Calculate investment allocation if there are allocations set
  const hasAllocations = allocations.length > 0

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <h1 className="text-3xl font-bold text-white">
          Dashboard
        </h1>
        <p className="text-blue-100 dark:text-blue-200 mt-2">
          Complete overview of your financial pipeline
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 -mt-12">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Salary</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {netSalary > 0 ? `₹${netSalary.toLocaleString('en-IN')}` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monthly income</p>
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
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              ₹{availableForExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">For expenses</p>
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
            {/* Net Salary */}
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-lg">Net Salary</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Your monthly income</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₹{netSalary.toLocaleString('en-IN')}
                </div>
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

            {/* Available for Expenses */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="font-semibold text-lg">Available for Expenses</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Your monthly expense budget</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  ₹{availableForExpenses.toLocaleString('en-IN')}
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
            <CardDescription>Last 5 expense entries</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
              <div className="space-y-3">
                {expenses.map((expense) => (
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