"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function ForeignSharesPage() {
  useEffect(() => {
    redirect("/investments/holdings?bucket=US_STOCK")
  }, [])

  return null
}