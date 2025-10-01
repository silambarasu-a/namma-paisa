"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function BlockedUserDetector() {
  const { status } = useSession()
  const pathname = usePathname()
  const [showBlockedPopup, setShowBlockedPopup] = useState(false)

  const checkIfBlocked = async () => {
    if (status === "authenticated") {
      try {
        const response = await fetch("/api/session")
        if (response.status === 403) {
          // User is blocked
          if (!showBlockedPopup) {
            setShowBlockedPopup(true)
            setTimeout(() => {
              signOut({ callbackUrl: "/auth/signin" })
            }, 3000)
          }
        }
      } catch {
        // Network error, ignore
      }
    }
  }

  useEffect(() => {
    // Check on mount and on page navigation
    checkIfBlocked()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pathname])

  useEffect(() => {
    // Also poll every 10 seconds as backup
    const interval = setInterval(checkIfBlocked, 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, showBlockedPopup])

  if (!showBlockedPopup) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md mx-4 border-4 border-red-500">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-10 h-10 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Account Blocked
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            You have been blocked by the admin
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You will be logged out in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  )
}
