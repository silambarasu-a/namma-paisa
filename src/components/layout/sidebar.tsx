"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  User,
  Calculator,
  TrendingUp,
  Receipt,
  Settings,
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
import { Button } from "@/components/ui/button"
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
      { name: "Transactions", href: "/investments/transactions", icon: Receipt },
      { name: "SIP Executions", href: "/investments/sip-executions", icon: TrendingUp },
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
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

export function Sidebar({ className, isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const isSuperAdmin = session?.user?.roles?.includes(Role.SUPER_ADMIN)
  const hasCustomerRole = session?.user?.roles?.includes(Role.CUSTOMER)

  // Drag state for mobile bottom sheet
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

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

  const closeSidebar = () => {
    setDragOffset(0)
    setIsOpen?.(false)
  }

  // Handle drag start
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartY.current = clientY
  }

  // Handle drag move
  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const diff = clientY - dragStartY.current

    // Only allow dragging down (positive offset)
    if (diff > 0) {
      setDragOffset(diff)
    }
  }

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false)

    // If dragged more than 100px, smoothly animate close
    if (dragOffset > 100) {
      // Animate to full height before closing
      setDragOffset(window.innerHeight)

      // Wait for animation to complete, then close
      setTimeout(() => {
        closeSidebar()
      }, 300) // Match the transition duration
    } else {
      // Snap back to original position
      setDragOffset(0)
    }
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:flex lg:fixed lg:left-4 lg:top-24 lg:h-[calc(100vh-7rem)] lg:w-80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl rounded-3xl z-10",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-blue-500/10 pointer-events-none rounded-3xl"></div>
        <div className="absolute inset-0 backdrop-blur-3xl rounded-3xl"></div>
        <div className="relative flex flex-col h-full w-full overflow-hidden">
          {/* Role Switcher for Super Admins with Customer Role */}
          {isSuperAdmin && hasCustomerRole && (
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
              <div className="relative overflow-hidden flex items-center justify-between space-x-3 p-3 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-white/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-gray-800/60 backdrop-blur-sm rounded-lg border border-blue-200/50 dark:border-blue-700/50 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none rounded-lg"></div>
                <div className="relative flex items-center space-x-2">
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
                  className="relative"
                />
                <div className="relative flex items-center space-x-2">
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

          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto overflow-x-hidden hover:overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent hover:scrollbar-thumb-purple-500/40">
            {allNavigation.map((item) => (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    isActive(item.href)
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                      : "text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:backdrop-blur-sm hover:shadow-md"
                  )}
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
                          "flex items-center px-3 py-2 text-sm rounded-lg transition-all",
                          isActive(child.href)
                            ? "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 font-medium shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:backdrop-blur-sm hover:shadow-sm"
                        )}
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

      {/* Mobile Bottom Sheet */}
      <div
        className={cn(
          "lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-gray-200/50 dark:border-gray-700/50",
          isOpen ? "translate-y-0" : "translate-y-full",
          isDragging ? "transition-none" : "transition-transform duration-300 ease-out"
        )}
        style={{
          top: "64px",
          transform: isOpen ? `translateY(${dragOffset}px)` : 'translateY(100%)'
        }}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none rounded-t-3xl"></div>
        <div className="relative flex flex-col h-full">
          {/* Handle Bar */}
          <div
            className="flex items-center justify-center py-3 border-b border-gray-200/50 dark:border-gray-700/50 cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onMouseDown={handleDragStart}
          >
            <div className="w-12 h-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-500 dark:to-pink-500 shadow-lg"></div>
          </div>

          {/* Header with Logo and Close Button */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-8" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Namma Paisa
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              className="h-9 w-9"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Role Switcher for Super Admins with Customer Role */}
          {isSuperAdmin && hasCustomerRole && (
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="relative overflow-hidden flex items-center justify-between p-3 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-white/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-blue-700/50">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none rounded-xl"></div>
                <div className="relative flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium">Customer</span>
                </div>
                <Switch
                  id="view-mode-mobile"
                  checked={viewMode === "admin"}
                  onCheckedChange={handleViewModeChange}
                  className="relative"
                />
                <div className="relative flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium">Admin</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {allNavigation.map((item) => (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-all",
                    isActive(item.href)
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                      : "text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:backdrop-blur-sm hover:shadow-md active:scale-95"
                  )}
                  onClick={closeSidebar}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>

                {/* Sub-navigation */}
                {item.children && (
                  <div className="ml-9 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all",
                          isActive(child.href)
                            ? "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 font-medium shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:backdrop-blur-sm hover:shadow-sm active:scale-95"
                        )}
                        onClick={closeSidebar}
                      >
                        <child.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{child.name}</span>
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
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-md"
          onClick={closeSidebar}
        />
      )}
    </>
  )
}