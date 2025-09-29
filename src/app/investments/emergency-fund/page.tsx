"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function EmergencyFundPage() {
  useEffect(() => {
    redirect("/investments/holdings?bucket=EMERGENCY_FUND")
  }, [])

  return null
}