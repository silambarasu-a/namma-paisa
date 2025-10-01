"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { Footer } from "./footer"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Don't show layout for auth pages and landing page
  if (pathname.startsWith("/auth") || pathname === "/unauthorized" || pathname === "/" || pathname === "/contact") {
    return <>{children}</>
  }

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show layout only for authenticated users
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="p-6 md:p-8 flex-1">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  )
}