"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function IndianSharesPage() {
  useEffect(() => {
    redirect("/investments/holdings?bucket=IND_STOCK")
  }, [])

  return null
}