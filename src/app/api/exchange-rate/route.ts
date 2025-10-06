import { NextResponse } from "next/server"

// Fetch USD to INR exchange rate
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || "USD"
    const to = searchParams.get("to") || "INR"

    // Use exchangerate-api.com free tier (1500 requests/month)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      {
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )

    if (!response.ok) {
      throw new Error(`Exchange rate API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const rate = data?.rates?.[to]

    if (!rate) {
      return NextResponse.json(
        { error: `Could not find exchange rate for ${from} to ${to}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      from,
      to,
      rate,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    )
  }
}
