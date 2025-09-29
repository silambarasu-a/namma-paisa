"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function CryptoPage() {
  useEffect(() => {
    redirect("/investments/holdings?bucket=CRYPTO")
  }, [])

  return null
}