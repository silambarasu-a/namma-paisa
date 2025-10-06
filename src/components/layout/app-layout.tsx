"use client"

import { useState } from "react"
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex flex-1 pt-20">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className="p-4 md:p-8 flex-1 min-w-0 lg:ml-[22rem]">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  )
}