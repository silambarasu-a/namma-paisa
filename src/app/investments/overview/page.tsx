"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function InvestmentsOverviewPage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/investments")
  }, [router])

  return null
}