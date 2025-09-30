"use client"

import { SessionProvider } from "next-auth/react"
import { BlockedUserDetector } from "./blocked-user-detector"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BlockedUserDetector />
      {children}
    </SessionProvider>
  )
}