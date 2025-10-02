"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  User,
  Calculator,
  TrendingUp,
  Receipt,
  Settings,
  Menu,
  X,
  PiggyBank,
  CreditCard,
  BarChart3,
  Wallet,
  Repeat,
  PieChart,
  Plus,
  FileText,
  Calendar,
  Users,
  Shield,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/icons/logo"
import type { NavigationItem } from "@/types"
import { Role } from "@/constants"

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Income", href: "/income", icon: TrendingUp },
  { name: "Tax", href: "/tax", icon: Calculator },
  { name: "Loans", href: "/loans", icon: Wallet },
  {
    name: "Investments",
    href: "/investments",
    icon: PiggyBank,
    children: [
      { name: "Allocations", href: "/investments/allocations", icon: PieChart },
      { name: "Holdings", href: "/investments/holdings", icon: BarChart3 },
      { name: "SIPs", href: "/investments/sips", icon: Repeat },
    ],
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: Receipt,
    children: [
      { name: "Add Expense", href: "/expenses?add=true", icon: Plus },
      { name: "Budget", href: "/expenses/budget", icon: PieChart },
      { name: "Reports", href: "/expenses/reports", icon: FileText },
    ],
  },
  { name: "Credit Cards", href: "/credit-cards", icon: CreditCard },
  { name: "Monthly Snapshot", href: "/monthly-snapshot", icon: Calendar },
]

const adminNavigation: NavigationItem[] = [
  { name: "Admin Dashboard", href: "/admin", icon: Shield },
  {
    name: "User Management",
    href: "/admin/users",
    icon: Users,
    children: [
      { name: "Super Admins", href: "/admin/users/super-admins", icon: Shield },
      { name: "Customers", href: "/admin/users/customers", icon: User },
    ],
  },
  { name: "System Settings", href: "/admin/settings", icon: Settings },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const isSuperAdmin = session?.user?.roles?.includes(Role.SUPER_ADMIN)

  // Determine view mode based on current route
  const isAdminRoute = pathname.startsWith("/admin")
  const viewMode = isAdminRoute ? "admin" : "customer"

  // Handle view mode toggle - redirect to appropriate dashboard
  const handleViewModeChange = (checked: boolean) => {
    if (checked) {
      router.push("/admin")
    } else {
      router.push("/dashboard")
    }
  }

  const isActive = (href: string) => {
    // Exact match for the href
    if (pathname === href) return true

    // For admin routes, check if the current path starts with the href
    // but exclude parent route when on a child route
    if (href === "/admin" && pathname.startsWith("/admin/")) {
      return false // Don't highlight "Admin Dashboard" when on /admin/users or /admin/settings
    }

    // For other routes, check if path starts with href + "/"
    return pathname.startsWith(href + "/")
  }

  const allNavigation = viewMode === "admin" && isSuperAdmin ? adminNavigation : navigation

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full md:h-screen">
          <div className="flex items-center justify-center gap-3 h-16 px-4 border-b border-gray-200 dark:border-gray-800">
            <Logo className="h-10 w-10" />
            <div className="flex flex-col leading-tight">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Namma Paisa
              </h1>
            </div>
          </div>

          {/* Role Switcher for Super Admins */}
          {isSuperAdmin && (
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label
                    htmlFor="view-mode"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Customer
                  </Label>
                </div>
                <Switch
                  id="view-mode"
                  checked={viewMode === "admin"}
                  onCheckedChange={handleViewModeChange}
                />
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <Label
                    htmlFor="view-mode"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Admin
                  </Label>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                {viewMode === "admin" ? "Admin View" : "Customer View"}
              </p>
            </div>
          )}

          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {allNavigation.map((item) => (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>

                {/* Sub-navigation */}
                {item.children && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                          isActive(child.href)
                            ? "bg-primary/20 text-primary"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <child.icon className="w-4 h-4 mr-3" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}