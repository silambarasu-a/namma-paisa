import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireRole } from "@/lib/authz"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, TrendingUp, Receipt, IndianRupee, Shield, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Role, ROLE_LABELS, getRoleBadgeColor } from "@/constants"

export const metadata: Metadata = {
  title: "Admin Dashboard",
}

async function getStats() {
  const [totalUsers, totalExpenses, totalSIPs, totalLoans] = await Promise.all([
    prisma.user.count(),
    prisma.expense.count(),
    prisma.sIP.count(),
    prisma.loan.count(),
  ])

  return { totalUsers, totalExpenses, totalSIPs, totalLoans }
}

async function getRecentUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      expenses: {
        select: { id: true },
      },
      salaries: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  })
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  requireRole(session, [Role.SUPER_ADMIN])

  const [stats, users] = await Promise.all([
    getStats(),
    getRecentUsers(),
  ])

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-900 dark:to-pink-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-white" />
          <h1 className="text-3xl font-bold text-white">
            Admin Dashboard
          </h1>
        </div>
        <p className="text-purple-100 dark:text-purple-200 mt-2">
          Platform-wide statistics and user management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 -mt-12">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
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
              {stats.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Expense entries</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SIPs</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalSIPs}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Investment plans</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.totalLoans}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Loan accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Last 10 registered users</CardDescription>
            </div>
            <Link href="/admin/users">
              <Button>
                Manage Users
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Income</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} className={getRoleBadgeColor(role)}>
                              {ROLE_LABELS[role]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.salaries[0]
                          ? `₹${Number(user.salaries[0].monthly).toLocaleString()}`
                          : "Not set"}
                      </TableCell>
                      <TableCell>{user.expenses.length}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}