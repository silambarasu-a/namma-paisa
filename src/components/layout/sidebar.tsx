"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  ShieldCheck,
  Wallet,
  Repeat,
  FolderKanban,
  PieChart,
  Plus,
  FileText,
  Calendar,
  type LucideIcon,
} from "lucide-react"

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Tax", href: "/tax", icon: Calculator },
  { name: "Loans", href: "/loans", icon: Wallet },
  {
    name: "Investments",
    href: "/investments",
    icon: TrendingUp,
    children: [
      { name: "Overview", href: "/investments/overview", icon: FolderKanban },
      { name: "Allocations", href: "/investments/allocations", icon: PieChart },
      { name: "Holdings", href: "/investments/holdings", icon: BarChart3 },
      { name: "SIPs", href: "/sips", icon: Repeat },
    ],
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: Receipt,
    children: [
      { name: "Overview", href: "/expenses/overview", icon: BarChart3 },
      { name: "Add Expense", href: "/expenses/new", icon: Plus },
      { name: "Reports", href: "/expenses/reports", icon: FileText },
    ],
  },
  { name: "Monthly Snapshot", href: "/monthly-snapshot", icon: Calendar },
]

const adminNavigation: NavigationItem[] = [
  { name: "Admin", href: "/admin", icon: Settings },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const allNavigation = [
    ...navigation,
    ...(session?.user?.role === "SUPER_ADMIN" ? adminNavigation : []),
  ]

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
          "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              en-rupee
            </h1>
          </div>

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